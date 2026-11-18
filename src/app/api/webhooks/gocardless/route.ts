import {NextRequest} from "next/server";
import {createHmac,timingSafeEqual} from "node:crypto";
import {supabaseAdmin} from "@/lib/supabase/admin";
import {gcRequest} from "@/lib/gocardless";

export const runtime="nodejs";
type Event={id:string;resource_type:string;action:string;links?:{payment?:string}};

export async function POST(request:NextRequest){
  const secret=process.env.GOCARDLESS_WEBHOOK_SECRET;
  const signature=request.headers.get("webhook-signature");
  if(!secret||!signature||!/^[a-fA-F0-9]{64}$/.test(signature))return new Response("Invalid signature",{status:401});
  const raw=await request.text();
  if(Buffer.byteLength(raw)>262144)return new Response("Payload too large",{status:413});
  const calculated=createHmac("sha256",secret).update(raw).digest("hex");
  if(!timingSafeEqual(Buffer.from(signature,"utf8"),Buffer.from(calculated,"utf8")))return new Response("Invalid signature",{status:401});
  let events:Event[];
  try{const parsed=JSON.parse(raw) as {events:Event[]};if(!Array.isArray(parsed.events)||parsed.events.length>200)throw new Error();events=parsed.events;}catch{return new Response("Bad payload",{status:400});}
  const db=supabaseAdmin();
  for(const event of events){
    if(typeof event.id!=="string"||event.id.length>120)continue;
    const {data:seen}=await db.from("payment_webhook_events").select("id").eq("id",event.id).maybeSingle();
    if(seen)continue;
    if(event.resource_type==="payments"&&event.links?.payment){
      const paymentId=event.links.payment;
      if(!/^PM[A-Za-z0-9]+$/.test(paymentId))continue;
      // Fetch the CURRENT payment to handle duplicate/out-of-order webhooks safely.
      const current=await gcRequest<{payments:{id:string;status:string}}>(`/payments/${paymentId}`,"GET");
      const newStatus=["confirmed","paid_out"].includes(current.payments.status)?"paid":
        ["failed","cancelled","charged_back"].includes(current.payments.status)?"failed":"pending";
      const change:{status:string;paid_at?:string|null}={status:newStatus};
      if(newStatus==="paid")change.paid_at=new Date().toISOString();
      const {error}=await db.from("invoices").update(change).eq("gocardless_payment_id",paymentId).neq("status","void");
      if(error)return new Response("Temporary processing failure",{status:500});
    }
    const {error:recordError}=await db.from("payment_webhook_events").insert({id:event.id});
    if(recordError&&recordError.code!=="23505")return new Response("Temporary processing failure",{status:500});
  }
  return new Response("OK",{status:200});
}
