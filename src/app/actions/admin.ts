"use server";
import {redirect} from "next/navigation";
import {z} from "zod";
import {requireAdmin} from "@/lib/auth";
import {fromForm} from "@/lib/format";
import {supabaseAdmin} from "@/lib/supabase/admin";
import {attendanceMinutes,previousMonth} from "@/lib/billing";
import {audit} from "@/lib/audit";
import {sendEmail} from "@/lib/email";
import {issueInvoice} from "@/lib/invoice-operations";
import {gcRequest,type Payment} from "@/lib/gocardless";

const uuid=z.uuid();
const date=z.iso.date();

export async function approveEnquiry(form:FormData){
  const {user}=await requireAdmin();
  const id=uuid.parse(fromForm(form,"enquiry_id"));
  const db=supabaseAdmin();
  const {data:enquiry,error}=await db.from("enquiries").select("id,parent_id,child_name,status").eq("id",id).single();
  if(error||!enquiry||enquiry.status==="rejected")throw new Error("Enquiry unavailable");
  const {error:profileError}=await db.from("profiles").update({approved:true}).eq("id",enquiry.parent_id).eq("role","parent");
  if(profileError)throw new Error("Could not approve profile");
  const {error:childError}=await db.from("children").upsert({enquiry_id:id,parent_id:enquiry.parent_id,name:enquiry.child_name},{onConflict:"enquiry_id",ignoreDuplicates:true});
  if(childError)throw new Error("Could not create child record");
  const {error:statusError}=await db.from("enquiries").update({status:"approved"}).eq("id",id);
  if(statusError)throw new Error("Could not update enquiry");
  await audit(user.id,"enquiry.approved",id);
  await notifyApproved(id);
  redirect("/admin/parents");
}

async function notifyApproved(id:string){
  const db=supabaseAdmin();
  const {data:enquiry}=await db.from("enquiries").select("parent_id,approval_email_sent_at").eq("id",id).single();
  if(!enquiry||enquiry.approval_email_sent_at)return;
  const {data:parent}=await db.from("profiles").select("email,full_name").eq("id",enquiry.parent_id).single();
  if(!parent?.email)return;
  try{
    await sendEmail({to:parent.email,subject:"Welcome to Little Explorers! Your account is approved",
      body:`Hello ${parent.full_name},\n\nYour Little Explorers account has been approved. You can now sign into your parent portal, complete your child's onboarding information, and see updates as they become available.`,
      idempotencyKey:`approval-${id}`});
    await db.from("enquiries").update({approval_email_sent_at:new Date().toISOString()}).eq("id",id);
  }catch{/* Keep approval; dashboard shows that the email needs retrying. */}
}

export async function retryApprovalEmail(form:FormData){
  const {user}=await requireAdmin();const id=uuid.parse(fromForm(form,"enquiry_id"));
  const db=supabaseAdmin();const {data}=await db.from("enquiries").select("status").eq("id",id).single();
  if(data?.status!=="approved")throw new Error("Enquiry is not approved");
  await notifyApproved(id);await audit(user.id,"enquiry.approval_email_retry",id);redirect("/admin/parents");
}

export async function rejectEnquiry(form:FormData){
  const {user}=await requireAdmin();const id=uuid.parse(fromForm(form,"enquiry_id"));
  const db=supabaseAdmin();
  const {error}=await db.from("enquiries").update({status:"rejected"}).eq("id",id).eq("status","pending");
  if(error)throw new Error("Unable to reject enquiry");await audit(user.id,"enquiry.rejected",id);redirect("/admin/parents");
}

export async function setChildRate(form:FormData){
  const {user}=await requireAdmin();const childId=uuid.parse(fromForm(form,"child_id"));
  const poundsString=fromForm(form,"hourly_rate");
  if(!/^\d{1,3}(\.\d{1,2})?$/.test(poundsString))throw new Error("Enter a valid hourly amount");
  const pence=Math.round(Number(poundsString)*100);
  if(pence<1||pence>50000)throw new Error("Hourly rate out of range");
  const {error}=await supabaseAdmin().from("children").update({hourly_rate_pence:pence}).eq("id",childId);
  if(error)throw new Error("Rate could not be saved");await audit(user.id,"child.rate_updated",childId);redirect("/admin/parents");
}

export async function addChild(form:FormData){
  const {user}=await requireAdmin();
  const parentId=uuid.parse(fromForm(form,"parent_id"));
  const name=z.string().min(2).max(120).parse(fromForm(form,"child_name"));
  const db=supabaseAdmin();
  const {data:parent}=await db.from("profiles").select("approved,role").eq("id",parentId).single();
  if(!parent?.approved||parent.role!=="parent")throw new Error("Parent must be approved first");
  const {data:child,error}=await db.from("children").insert({parent_id:parentId,name}).select("id").single();
  if(error||!child)throw new Error("Could not add child");
  await audit(user.id,"child.created",child.id);redirect("/admin/parents");
}

export async function recordAttendance(form:FormData){
  const {user}=await requireAdmin();
  const childId=uuid.parse(fromForm(form,"child_id"));const day=date.parse(fromForm(form,"attended_on"));
  const start=fromForm(form,"checked_in"),end=fromForm(form,"checked_out");
  const minutes=attendanceMinutes(start,end);
  const notes=z.string().max(2000).parse(fromForm(form,"notes"));
  const db=supabaseAdmin();const {data:child}=await db.from("children").select("hourly_rate_pence").eq("id",childId).single();
  if(!child?.hourly_rate_pence)throw new Error("Set this child's hourly rate first");
  const {data:inserted,error}=await db.from("attendance").insert({child_id:childId,attended_on:day,checked_in:start,checked_out:end,minutes,rate_pence:child.hourly_rate_pence,notes,recorded_by:user.id}).select("id").single();
  if(error||!inserted)throw new Error("Attendance could not be saved (possibly already recorded)");
  await audit(user.id,"attendance.created",inserted.id);redirect("/admin/attendance");
}

export async function recordIncident(form:FormData){
  const {user}=await requireAdmin();const childId=uuid.parse(fromForm(form,"child_id"));
  const day=date.parse(fromForm(form,"happened_on"));
  const title=z.string().min(3).max(180).parse(fromForm(form,"title"));
  const description=z.string().min(10).max(6000).parse(fromForm(form,"description"));
  const action=z.string().min(5).max(6000).parse(fromForm(form,"action_taken"));
  const db=supabaseAdmin();const {data:incident,error}=await db.from("incidents").insert({child_id:childId,happened_on:day,title,description,action_taken:action,recorded_by:user.id}).select("id").single();
  if(error||!incident)throw new Error("Report could not be saved");
  await audit(user.id,"incident.created",incident.id);
  const {data:child}=await db.from("children").select("parent_id").eq("id",childId).single();
  if(child){const {data:parent}=await db.from("profiles").select("email,full_name").eq("id",child.parent_id).single();
    if(parent?.email)try{await sendEmail({to:parent.email,subject:"New Little Explorers incident report",
      body:`Hello ${parent.full_name},\n\nA new incident report is available in your secure parent portal. Please sign in to read and acknowledge it.`,idempotencyKey:`incident-${incident.id}`});}catch{/* report is saved; do not disclose its details in email */}
  }
  redirect("/admin/incidents");
}

export async function generateDrafts(form:FormData){
  const {user}=await requireAdmin();
  const month=fromForm(form,"month");
  if(!/^\d{4}-(0[1-9]|1[0-2])$/.test(month))throw new Error("Invalid billing month");
  const [year,m]=month.split("-").map(Number);
  const start=`${month}-01`;
  const end=new Date(Date.UTC(year,m,0)).toISOString().slice(0,10);
  const {error}=await supabaseAdmin().rpc("generate_invoice_drafts",{p_start:start,p_end:end});
  if(error)throw new Error(`Invoice generation failed: ${error.message}`);
  await audit(user.id,"invoices.generated",month);redirect("/admin/invoices");
}

export async function refreshDraft(form:FormData){
  const {user}=await requireAdmin();const id=uuid.parse(fromForm(form,"invoice_id"));
  const {error}=await supabaseAdmin().rpc("rebuild_invoice_draft",{p_invoice_id:id});
  if(error)throw new Error("Draft could not be refreshed");
  await audit(user.id,"invoice.draft_refreshed",id);redirect("/admin/invoices");
}

export async function issueDraft(form:FormData){
  const {user}=await requireAdmin();const id=uuid.parse(fromForm(form,"invoice_id"));
  await issueInvoice(id);await audit(user.id,"invoice.issued",id);redirect("/admin/invoices");
}

export async function collectInvoice(form:FormData){
  const {user}=await requireAdmin();const id=uuid.parse(fromForm(form,"invoice_id"));
  const db=supabaseAdmin();
  const {data:inv}=await db.from("invoices").select("id,parent_id,status,total_pence,gocardless_payment_id").eq("id",id).single();
  if(!inv||!["issued","failed"].includes(inv.status)||inv.gocardless_payment_id)throw new Error("Invoice cannot be collected in its current state");
  const {data:mandate}=await db.from("mandates").select("mandate_id").eq("parent_id",inv.parent_id).single();
  if(!mandate)throw new Error("Parent has not set up a Direct Debit mandate");
  if(inv.total_pence<100)throw new Error("GoCardless minimum payment is £1");
  const result=await gcRequest<Payment>("/payments","POST",{payments:{amount:inv.total_pence,currency:"GBP",links:{mandate:mandate.mandate_id},metadata:{invoice_id:id}}},`little-explorers-${id}`);
  const {error}=await db.from("invoices").update({gocardless_payment_id:result.payments.id,status:"pending"}).eq("id",id).in("status",["issued","failed"]);
  if(error)throw new Error("Payment was submitted but invoice status needs reconciliation. Do NOT re-collect manually.");
  await audit(user.id,"invoice.collection_requested",id);redirect("/admin/invoices");
}

export async function recordBankPayment(form:FormData){
  const {user}=await requireAdmin();const id=uuid.parse(fromForm(form,"invoice_id"));const db=supabaseAdmin();
  const {data:invoice}=await db.from("invoices").select("gocardless_payment_id,status").eq("id",id).single();
  if(!invoice||invoice.gocardless_payment_id||invoice.status!=="issued")throw new Error("Only issued invoices with no Direct Debit attempt can be marked as bank paid");
  const {error}=await db.from("invoices").update({status:"paid",paid_at:new Date().toISOString()}).eq("id",id).eq("status","issued");
  if(error)throw new Error("Could not record payment");
  await audit(user.id,"invoice.bank_payment_recorded",id);redirect("/admin/invoices");
}
