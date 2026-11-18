import {NextRequest} from "next/server";
import {timingSafeEqual} from "node:crypto";
import {supabaseAdmin} from "@/lib/supabase/admin";
import {gcBase} from "@/lib/gocardless";

export async function GET(request:NextRequest){
  const secret=process.env.HEALTH_CHECK_SECRET;
  const supplied=request.headers.get("x-health-secret");
  if(!secret||!supplied||Buffer.byteLength(secret)!==Buffer.byteLength(supplied)||!timingSafeEqual(Buffer.from(secret),Buffer.from(supplied)))return new Response("Not found",{status:404});
  let database=false;let invoices=false;let resend=false;let gocardless=false;
  try{
    const db=supabaseAdmin();
    const {error}=await db.from("profiles").select("id",{head:true,count:"exact"});database=!error;
    const {data:job}=await db.from("job_heartbeats").select("last_success").eq("name","monthly_invoices").maybeSingle();
    // A healthy invoice job has run in the past 35 days (after initial deployment).
    invoices=!!job&&Date.now()-new Date(job.last_success).getTime()<35*24*60*60*1000;
  }catch{/* send only booleans; never leak SQL or service details */}
  if(process.env.RESEND_API_KEY)try{
    const response=await fetch("https://api.resend.com/domains",{headers:{Authorization:`Bearer ${process.env.RESEND_API_KEY}`},signal:AbortSignal.timeout(6000),cache:"no-store"});resend=response.ok;
  }catch{}
  if(process.env.GOCARDLESS_ACCESS_TOKEN)try{
    const response=await fetch(`${gcBase()}/creditors`,{headers:{Authorization:`Bearer ${process.env.GOCARDLESS_ACCESS_TOKEN}`,"GoCardless-Version":"2015-07-06"},signal:AbortSignal.timeout(6000),cache:"no-store"});gocardless=response.ok;
  }catch{}
  return Response.json({database,invoices,resend,gocardless},{headers:{"Cache-Control":"private, no-store"}});
}
