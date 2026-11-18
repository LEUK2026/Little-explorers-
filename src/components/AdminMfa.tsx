"use client";
import {useEffect,useState} from "react";
import {createBrowserClient} from "@supabase/ssr";
import {useRouter} from "next/navigation";

export function AdminMfa(){
  const router=useRouter();
  const [factorId,setFactorId]=useState("");const [qr,setQr]=useState("");const [code,setCode]=useState("");const [error,setError]=useState("");const [busy,setBusy]=useState(false);
  const [supabase]=useState(()=>createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!));
  useEffect(()=>{
    let active=true;
    async function load(){
      const factors=await supabase.auth.mfa.listFactors();
      if(!active)return;
      const existing=factors.data?.totp?.find(f=>f.status==="verified");
      if(existing){setFactorId(existing.id);return;}
      const enrollment=await supabase.auth.mfa.enroll({factorType:"totp",friendlyName:"Little Explorers admin"});
      if(!active)return;
      if(enrollment.error){setError("Unable to start verification. Please try again.");return;}
      setFactorId(enrollment.data.id);setQr(enrollment.data.totp.qr_code);
    }
    void load(); return ()=>{active=false;};
  },[supabase]);
  async function verify(event:React.FormEvent){event.preventDefault();setBusy(true);setError("");
    const result=await supabase.auth.mfa.challengeAndVerify({factorId,code});setBusy(false);
    if(result.error){setError("Invalid code. Try the current code from your authenticator app.");return;}
    router.replace("/admin");router.refresh();
  }
  return <div className="card form-wrap narrow"><span className="eyebrow">Account security</span><h1 style={{fontSize:"2.4rem"}}>Two-factor authentication</h1><p>Every administrator must verify a code from an authenticator app before opening sensitive records.</p>
    {qr&&<><p>Scan this code using an authenticator app, then enter the six-digit number it shows.</p><img src={qr} alt="Authenticator setup QR code" width={210} height={210}/></>}
    {!qr&&<p>Enter the current code from your existing authenticator app.</p>}
    {error&&<p className="alert error" role="alert">{error}</p>}
    <form onSubmit={verify} className="stack"><div className="field"><label htmlFor="mfa">6-digit verification code</label><input id="mfa" value={code} onChange={e=>setCode(e.target.value.replace(/\D/g,"").slice(0,6))} inputMode="numeric" pattern="[0-9]{6}" required autoComplete="one-time-code"/></div><button className="btn" disabled={busy||code.length!==6||!factorId}>{busy?"Verifying…":"Verify and continue"}</button></form>
  </div>;
}
