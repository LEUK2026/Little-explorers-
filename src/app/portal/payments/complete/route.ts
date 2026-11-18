import {NextRequest,NextResponse} from "next/server";
import {supabaseServer} from "@/lib/supabase/server";
import {supabaseAdmin} from "@/lib/supabase/admin";
import {gcRequest,type RedirectFlow} from "@/lib/gocardless";

export async function GET(request:NextRequest){
  const supabase=await supabaseServer();const {data:{user}}=await supabase.auth.getUser();
  if(!user)return NextResponse.redirect(new URL("/login",request.url));
  const {data:profile}=await supabase.from("profiles").select("approved,role").eq("id",user.id).single();
  if(!profile?.approved||profile.role!=="parent")return new Response("Forbidden",{status:403});
  const flowId=new URL(request.url).searchParams.get("redirect_flow_id");
  if(!flowId||!/^RE[0-9A-Za-z_-]+$/.test(flowId))return NextResponse.redirect(new URL("/portal/invoices?mandate=invalid",request.url));
  const db=supabaseAdmin();const {data:session}=await db.from("mandate_setup_sessions").select("session_token,expires_at").eq("redirect_flow_id",flowId).eq("parent_id",user.id).maybeSingle();
  if(!session||new Date(session.expires_at).getTime()<Date.now())return NextResponse.redirect(new URL("/portal/invoices?mandate=expired",request.url));
  try{
    const result=await gcRequest<RedirectFlow>(`/redirect_flows/${encodeURIComponent(flowId)}/actions/complete`,"POST",{data:{session_token:session.session_token}},`mandate-complete-${flowId}`);
    const mandateId=result.redirect_flows.links?.mandate;
    if(!mandateId)throw new Error("No mandate was returned");
    const {error}=await db.from("mandates").upsert({parent_id:user.id,mandate_id:mandateId},{onConflict:"parent_id"});
    if(error)throw error;
    await db.from("mandate_setup_sessions").delete().eq("redirect_flow_id",flowId);
    return NextResponse.redirect(new URL("/portal/invoices?mandate=success",request.url));
  }catch{return NextResponse.redirect(new URL("/portal/invoices?mandate=failed",request.url));}
}
