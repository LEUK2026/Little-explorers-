import "server-only";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { sendEmail } from "@/lib/email";
import { pounds } from "@/lib/format";

export async function issueInvoice(invoiceId: string): Promise<{emailed:boolean}> {
  const db=supabaseAdmin();
  const {data:invoice,error:loadError}=await db.from("invoices").select("id,parent_id,status,invoice_number,total_pence,email_sent_at").eq("id",invoiceId).single();
  if(loadError||!invoice||!["draft","issued"].includes(invoice.status))throw new Error("Invoice cannot be issued");
  if(invoice.status==="draft"){
    const {data:changed,error}=await db.from("invoices").update({status:"issued",issued_at:new Date().toISOString()}).eq("id",invoiceId).eq("status","draft").select("id").maybeSingle();
    if(error||!changed)throw new Error("Invoice changed while issuing. Please refresh.");
  }
  if(invoice.email_sent_at)return {emailed:true};
  const {data:profile}=await db.from("profiles").select("email,full_name").eq("id",invoice.parent_id).single();
  if(!profile?.email)throw new Error("Missing parent email");
  try{
    await sendEmail({to:profile.email,subject:`Your Little Explorers invoice LE-${invoice.invoice_number}`,
      body:`Hello ${profile.full_name},\n\nYour childcare invoice LE-${invoice.invoice_number} for ${pounds(invoice.total_pence)} is now ready. Please sign in to your private parent portal to view the details and download your invoice.\n\nIf you pay by bank transfer, use your invoice number as the reference.`,
      idempotencyKey:`invoice-issue-${invoiceId}`});
    await db.from("invoices").update({email_sent_at:new Date().toISOString()}).eq("id",invoiceId);
    return {emailed:true};
  }catch{return {emailed:false};}
}
