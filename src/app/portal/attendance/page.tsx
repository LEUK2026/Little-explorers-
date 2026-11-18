import {requireParent} from "@/lib/auth";
import {ParentShell} from "@/components/ParentShell";
import {pounds,ukDate} from "@/lib/format";
import {costPence} from "@/lib/billing";
export const metadata={title:"Your Attendance"};
export default async function Attendance(){const {supabase}=await requireParent();
  const [{data:children},{data:rows}]=await Promise.all([supabase.from("children").select("id,name"),supabase.from("attendance").select("id,child_id,attended_on,checked_in,checked_out,minutes,rate_pence").order("attended_on",{ascending:false}).limit(150)]);
  const names=new Map((children||[]).map(c=>[c.id,c.name]));
  const total=(rows||[]).reduce((sum,r)=>sum+costPence(r.minutes,r.rate_pence),0);
  return <ParentShell><span className="eyebrow">Your childcare hours</span><h1>Attendance</h1><p>Nicole records the actual hours attended. The values shown are estimates; your issued monthly invoice is the final bill.</p><div className="card" style={{margin:"1.5rem 0"}}><h3>Recent attendance</h3>
    <div className="overflow"><table className="data"><thead><tr><th>Date</th><th>Child</th><th>Times</th><th>Hours</th><th>Estimated cost</th></tr></thead><tbody>{(rows||[]).map(r=><tr key={r.id}><td>{ukDate(r.attended_on)}</td><td>{names.get(r.child_id)}</td><td>{r.checked_in.slice(0,5)}–{r.checked_out.slice(0,5)}</td><td>{(r.minutes/60).toFixed(2)}</td><td>{pounds(costPence(r.minutes,r.rate_pence))}</td></tr>)}{!(rows||[]).length&&<tr><td colSpan={5}>No attendance recorded yet.</td></tr>}</tbody></table></div>
    <p><strong>Estimated total for displayed records: {pounds(total)}</strong></p>
  </div></ParentShell>;
}
