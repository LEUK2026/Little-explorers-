import {NextRequest,NextResponse} from "next/server";
import {z} from "zod";
import {supabaseServer} from "@/lib/supabase/server";
import {supabaseAdmin} from "@/lib/supabase/admin";

export async function GET(request:NextRequest,{params}:{params:Promise<{id:string}>}){
  const {id}=await params;
  if(!z.uuid().safeParse(id).success)return new Response("Not found",{status:404});
  const supabase=await supabaseServer();
  const {data:{user}}=await supabase.auth.getUser();
  if(!user)return new Response("Unauthorised",{status:401});
  const {data:profile}=await supabase.from("profiles").select("approved,role").eq("id",user.id).single();
  if(!profile)return new Response("Forbidden",{status:403});
  if(profile.role==="admin"){
    const {data:aal}=await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    if(aal?.currentLevel!=="aal2")return new Response("MFA required",{status:403});
  }else if(!profile.approved)return new Response("Forbidden",{status:403});
  // RLS checks current consent and ownership before issuing a short-lived URL.
  const {data:photo}=await supabase.from("photos").select("storage_path").eq("id",id).maybeSingle();
  if(!photo)return new Response("Not found",{status:404});
  const {data,error}=await supabaseAdmin().storage.from("child-photos").createSignedUrl(photo.storage_path,45);
  if(error||!data?.signedUrl)return new Response("Photo unavailable",{status:503});
  return NextResponse.redirect(data.signedUrl,{status:302,headers:{"Cache-Control":"private, no-store","Referrer-Policy":"no-referrer"}});
}
