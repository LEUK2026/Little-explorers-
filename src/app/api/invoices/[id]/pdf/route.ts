import {NextRequest} from "next/server";
import {PDFDocument,StandardFonts,rgb} from "pdf-lib";
import {z} from "zod";
import {supabaseServer} from "@/lib/supabase/server";
import {pounds,ukDate} from "@/lib/format";

export async function GET(_request:NextRequest,{params}:{params:Promise<{id:string}>}){
  const {id}=await params;if(!z.uuid().safeParse(id).success)return new Response("Not found",{status:404});
  const db=await supabaseServer();const {data:{user}}=await db.auth.getUser();if(!user)return new Response("Unauthorised",{status:401});
  const {data:profile}=await db.from("profiles").select("role,approved").eq("id",user.id).single();
  if(!profile)return new Response("Forbidden",{status:403});
  if(profile.role==="admin"){
    const {data:aal}=await db.auth.mfa.getAuthenticatorAssuranceLevel();
    if(aal?.currentLevel!=="aal2")return new Response("MFA required",{status:403});
  }else if(!profile.approved)return new Response("Forbidden",{status:403});
  const {data:invoice}=await db.from("invoices").select("*").eq("id",id).maybeSingle();
  if(!invoice||(profile.role!=="admin"&&["draft","void"].includes(invoice.status)))return new Response("Not found",{status:404});
  const {data:items}=await db.from("invoice_items").select("attended_on,minutes,rate_pence,amount_pence").eq("invoice_id",id).order("attended_on");
  const {data:parent}=await db.from("profiles").select("full_name,email").eq("id",invoice.parent_id).maybeSingle();
  const pdf=await PDFDocument.create();let page=pdf.addPage([595,842]);const font=await pdf.embedFont(StandardFonts.Helvetica);const bold=await pdf.embedFont(StandardFonts.HelveticaBold);
  const safe=(v:string)=>v.replace(/[^\x20-\x7E\xA3]/g,"?").slice(0,110);
  let y=790;
  const line=(str:string,size=11,isBold=false)=>{if(y<75){page=pdf.addPage([595,842]);y=790;}page.drawText(safe(str),{x:48,y,size,font:isBold?bold:font,color:rgb(.17,.33,.24)});y-=size+13;};
  line("LITTLE EXPLORERS",24,true);line("Childminding in Livingston, Scotland",11);y-=20;
  line(`Invoice: LE-${invoice.invoice_number}`,15,true);line(`Period: ${ukDate(invoice.period_start)} to ${ukDate(invoice.period_end)}`);line(`Due date: ${ukDate(invoice.due_on)}`);line(`Status: ${invoice.status.toUpperCase()}`);y-=14;
  line(`Bill to: ${parent?.full_name||"Parent"}`);line(parent?.email||"");y-=16;
  line("Attendance date         Hours       Hourly rate      Amount",11,true);
  for(const item of items||[]){line(`${ukDate(item.attended_on).padEnd(27)}${(item.minutes/60).toFixed(2).padEnd(14)}${pounds(item.rate_pence).padEnd(18)}${pounds(item.amount_pence)}`,10);}
  y-=16;line(`TOTAL DUE: ${pounds(invoice.total_pence)}`,17,true);
  line("Please quote your invoice number as the bank transfer reference.",10);
  const bytes=await pdf.save();
  return new Response(bytes as BodyInit,{headers:{"Content-Type":"application/pdf","Content-Disposition":`attachment; filename="LE-${invoice.invoice_number}.pdf"`,"Cache-Control":"private, no-store","X-Content-Type-Options":"nosniff"}});
}
