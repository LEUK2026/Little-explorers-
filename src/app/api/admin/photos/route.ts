import {NextRequest,NextResponse} from "next/server";
import {randomUUID} from "node:crypto";
import sharp from "sharp";
import {requireAdmin} from "@/lib/auth";
import {supabaseAdmin} from "@/lib/supabase/admin";
import {audit} from "@/lib/audit";
import {z} from "zod";
import {appUrl} from "@/lib/env";

export const runtime="nodejs";

function isSupportedImage(bytes:Uint8Array):boolean {
  const jpeg=bytes.length>3&&bytes[0]===0xff&&bytes[1]===0xd8&&bytes[2]===0xff;
  const png=bytes.length>8&&[137,80,78,71,13,10,26,10].every((x,i)=>bytes[i]===x);
  const webp=bytes.length>12&&String.fromCharCode(...bytes.slice(0,4))==="RIFF"&&String.fromCharCode(...bytes.slice(8,12))==="WEBP";
  return jpeg||png||webp;
}

export async function POST(request:NextRequest){
  // The upload endpoint is not a Next.js server action, so check same-origin explicitly.
  if(request.headers.get("origin")!==new URL(appUrl()).origin)return new Response("Forbidden",{status:403});
  const {user}=await requireAdmin();
  const contentLength=Number(request.headers.get("content-length")||"0");
  if(contentLength>3_500_000)return new Response("Upload too large",{status:413});
  const form=await request.formData();
  const rawId=form.get("child_id");const childId=typeof rawId==="string"?rawId:"";
  if(!z.uuid().safeParse(childId).success)return new Response("Invalid child",{status:400});
  const caption=String(form.get("caption")||"").trim().slice(0,180);
  const file=form.get("photo");
  if(!(file instanceof File)||!(["image/jpeg","image/png","image/webp"].includes(file.type))||file.size<1||file.size>3_145_728){
    return new Response("Invalid photo type or size",{status:400});
  }
  const source=new Uint8Array(await file.arrayBuffer());
  if(!isSupportedImage(source))return new Response("Invalid photo",{status:400});
  let processed:Buffer;
  try{
    // Resize & transcode; this strips EXIF/location metadata and rejects malformed images.
    processed=await sharp(source,{limitInputPixels:20_000_000}).rotate().resize({width:1800,height:1800,fit:"inside",withoutEnlargement:true}).jpeg({quality:85}).toBuffer();
  }catch{return new Response("Image processing failed",{status:400});}
  const db=supabaseAdmin();
  const {data:child}=await db.from("children").select("id,parent_id").eq("id",childId).single();
  const {data:consent}=await db.from("child_onboarding").select("photo_consent").eq("child_id",childId).single();
  if(!child||!consent?.photo_consent)return new Response("Photo sharing consent is required",{status:403});
  const path=`${childId}/${randomUUID()}.jpg`;
  const {error:uploadError}=await db.storage.from("child-photos").upload(path,processed,{contentType:"image/jpeg",upsert:false,cacheControl:"0"});
  if(uploadError)return new Response("Upload failed",{status:500});
  const {data:photo,error:saveError}=await db.from("photos").insert({child_id:childId,storage_path:path,caption,uploaded_by:user.id}).select("id").single();
  if(saveError||!photo){await db.storage.from("child-photos").remove([path]);return new Response("Could not record uploaded photo",{status:500});}
  await audit(user.id,"photo.uploaded",photo.id);
  return NextResponse.redirect(new URL("/admin/photos",request.url),303);
}
