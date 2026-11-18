import Link from "next/link";
import {requireParent} from "@/lib/auth";
import {ParentShell} from "@/components/ParentShell";
import {pounds} from "@/lib/format";
import {costPence} from "@/lib/billing";
export const metadata={title:"Parent Dashboard"};
export default async function Portal(){const {profile,supabase}=await requireParent();
  const {data:children}=await supabase.from("children").select("id,name");
  const ids=(children||[]).map(c=>c.id);
  const start=new Date().toISOString().slice(0,7)+"-01";
  const {data:attendance}=ids.length?await supabase.from("attendance").select("minutes,rate_pence").in("child_id",ids).gte("attended_on",start):{data:[]};
  const minutes=(attendance||[]).reduce((total,r)=>total+r.minutes,0);
  const total=(attendance||[]).reduce((total,r)=>total+costPence(r.minutes,r.rate_pence),0);
  return <ParentShell><span className="eyebrow">Family portal</span><h1>Hello, {profile.full_name?.split(" ")[0]||"explorer"} 👋</h1><p>Welcome to your family's private Little Explorers space.</p>
    <div className="dashboard-cards" style={{margin:"2rem 0"}}>
      <div className="card"><small>Registered children</small><span className="metric">{ids.length}</span></div>
      <div className="card"><small>Hours recorded this month</small><span className="metric">{(minutes/60).toFixed(2)}</span></div>
      <div className="card"><small>Estimated monthly fees</small><span className="metric">{pounds(total)}</span><small>Not a final invoice</small></div>
    </div>
    <div className="grid2"><div className="card"><span className="emoji" aria-hidden="true">🌱</span><h3>Child onboarding</h3><p>Share your child's routines, needs and permissions. Reviews are automatically dated for six months later.</p><Link className="btn small" href="/portal/onboarding">Complete details</Link></div>
    <div className="card"><span className="emoji" aria-hidden="true">📅</span><h3>Attendance & invoices</h3><p>See childcare hours, monthly estimates and issued invoices.</p><Link className="btn small" href="/portal/attendance">See attendance</Link></div></div>
  </ParentShell>;
}
