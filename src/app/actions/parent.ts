"use server";
import {redirect} from "next/navigation";
import {z} from "zod";
import {requireParent} from "@/lib/auth";
import {fromForm} from "@/lib/format";
import {addCalendarMonths} from "@/lib/billing";
import {gcRequest,type RedirectFlow} from "@/lib/gocardless";
import {appUrl} from "@/lib/env";
import {supabaseAdmin} from "@/lib/supabase/admin";

export async function saveOnboarding(form:FormData){
  const {supabase}=await requireParent();
  const child_id=z.uuid().parse(fromForm(form,"child_id"));
  const dob=z.iso.date().parse(fromForm(form,"date_of_birth"));
  const needs=form.get("special_needs")==="yes";
  const details=z.string().max(4000).parse(fromForm(form,"special_needs_details"));
  if(needs&&!details)throw new Error("Special needs details are required when Yes is selected");
  const input={
    child_id,
    date_of_birth:dob,
    address:z.string().min(5).max(500).parse(fromForm(form,"address")),
    emergency_contact:z.string().min(5).max(300).parse(fromForm(form,"emergency_contact")),
    medical_information:z.string().max(4000).parse(fromForm(form,"medical_information")),
    sunscreen_allowed:form.get("sunscreen_allowed")==="yes",
    outings_allowed:form.get("outings_allowed")==="yes",
    photo_consent:form.get("photo_consent")==="yes",
    special_needs:needs,
    special_needs_details:needs?details:"",
    areas_to_support:z.string().max(4000).parse(fromForm(form,"areas_to_support")),
    sleeping_routine:z.string().max(4000).parse(fromForm(form,"sleeping_routine")),
    feeding_eating:z.string().max(4000).parse(fromForm(form,"feeding_eating")),
    completed_on:new Date().toISOString().slice(0,10),
    review_due_on:addCalendarMonths(new Date().toISOString().slice(0,10),6),
    updated_at:new Date().toISOString(),
  };
  const {error}=await supabase.from("child_onboarding").upsert(input,{onConflict:"child_id"});
  if(error)throw new Error("Could not save onboarding. Check your account access and try again.");
  redirect("/portal/onboarding?saved=1");
}

export async function acknowledgeIncident(form:FormData){
  const {user,supabase}=await requireParent();
  const id=z.uuid().parse(fromForm(form,"incident_id"));
  const {error}=await supabase.from("incident_acknowledgements").upsert({incident_id:id,parent_id:user.id},{onConflict:"incident_id,parent_id",ignoreDuplicates:true});
  if(error)throw new Error("Unable to acknowledge report");
  redirect("/portal/incidents");
}

export async function startMandate(){
  const {user,profile}=await requireParent();const db=supabaseAdmin();
  const {data:existing}=await db.from("mandates").select("mandate_id").eq("parent_id",user.id).maybeSingle();
  if(existing)redirect("/portal/invoices?mandate=already");
  const token=crypto.randomUUID();
  const response=await gcRequest<RedirectFlow>("/redirect_flows","POST",{
    redirect_flows:{description:"Little Explorers childcare fees",session_token:token,
      success_redirect_url:`${appUrl()}/portal/payments/complete`,prefilled_customer:{email:profile.email}},
  },`mandate-start-${user.id}-${token}`);
  const {error}=await db.from("mandate_setup_sessions").insert({redirect_flow_id:response.redirect_flows.id,parent_id:user.id,session_token:token});
  if(error)throw new Error("Could not save payment setup session");
  const destination=new URL(response.redirect_flows.redirect_url);
  if(!["pay.gocardless.com","pay-sandbox.gocardless.com"].includes(destination.hostname)||destination.protocol!=="https:"){
    throw new Error("Unexpected GoCardless redirect destination");
  }
  redirect(destination.toString());
}
