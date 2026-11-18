import {NextRequest} from "next/server";
import {timingSafeEqual} from "node:crypto";
import {supabaseAdmin} from "@/lib/supabase/admin";
import {previousMonth} from "@/lib/billing";
import {issueInvoice} from "@/lib/invoice-operations";

function authorised(request:NextRequest):boolean {
  const secret=process.env.CRON_SECRET;
  const supplied=request.headers.get("authorization")?.replace(/^Bearer\s+/i,"");
  if(!secret||!supplied)return false;
  const left=Buffer.from(secret),right=Buffer.from(supplied);
  return left.length===right.length&&timingSafeEqual(left,right);
}

async function execute(request:NextRequest){
  if(!authorised(request))return new Response("Unauthorised",{status:401});
  const db=supabaseAdmin();const {start,end}=previousMonth(new Date());
  const {data,error}=await db.rpc("generate_invoice_drafts",{p_start:start,p_end:end});
  if(error)return Response.json({ok:false,error:"Draft generation failed"},{status:500});
  let issued=0;
  if(process.env.INVOICE_AUTO_ISSUE==="true"){
    const {data:drafts}=await db.from("invoices").select("id").eq("status","draft").eq("period_start",start).eq("period_end",end);
    for(const draft of drafts||[]){await issueInvoice(draft.id);issued++;}
  }
  return Response.json({ok:true,draftsCreated:data,issued},{headers:{"Cache-Control":"no-store"}});
}

export const POST=execute;
export const GET=execute;
