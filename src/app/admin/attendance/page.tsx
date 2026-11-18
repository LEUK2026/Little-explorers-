import {requireAdmin} from "@/lib/auth";
import {supabaseAdmin} from "@/lib/supabase/admin";
import {AdminShell} from "@/components/AdminShell";
import {recordAttendance} from "@/app/actions/admin";
import {ukDate,pounds} from "@/lib/format";
import {costPence} from "@/lib/billing";
export const metadata={title:"Record Attendance",robots:{index:false}};
export default async function Attendance(){await requireAdmin();const db=supabaseAdmin();
  const [{data:children},{data:rows}]=await Promise.all([db.from("children").select("id,name,hourly_rate_pence").order("name"),db.from("attendance").select("*").order("attended_on",{ascending:false}).limit(100)]);
  const names=new Map((children||[]).map(c=>[c.id,c.name]));
  return <AdminShell><span className="eyebrow">Hourly billing</span><h1>Attendance</h1><p>Record the actual start and finish of every childcare session. Billing uses the hourly rate recorded at that moment.</p>
    <section className="card" style={{margin:"1.5rem 0"}}><h3>Add an attendance record</h3><form action={recordAttendance} className="stack">
      <div className="field"><label htmlFor="child">Child</label><select id="child" name="child_id" required>{(children||[]).map(c=><option key={c.id} value={c.id}>{c.name} — {pounds(c.hourly_rate_pence)}/hour</option>)}</select></div>
      <div className="grid2"><div className="field"><label htmlFor="attended_on">Date</label><input id="attended_on" name="attended_on" type="date" required/></div><div className="field"><label htmlFor="checked_in">Check in</label><input id="checked_in" name="checked_in" type="time" required/></div></div>
      <div className="field"><label htmlFor="checked_out">Check out</label><input id="checked_out" name="checked_out" type="time" required/></div>
      <div className="field"><label htmlFor="notes">Notes (optional)</label><textarea id="notes" name="notes" maxLength={2000}/></div><button className="btn" disabled={!(children||[]).length}>Save attendance</button>
    </form></section>
    <section className="card"><h3>Recent sessions</h3><div className="overflow"><table className="data"><thead><tr><th>Date</th><th>Child</th><th>Times</th><th>Hours</th><th>Cost</th></tr></thead><tbody>{(rows||[]).map(a=><tr key={a.id}><td>{ukDate(a.attended_on)}</td><td>{names.get(a.child_id)}</td><td>{a.checked_in.slice(0,5)}–{a.checked_out.slice(0,5)}</td><td>{(a.minutes/60).toFixed(2)}</td><td>{pounds(costPence(a.minutes,a.rate_pence))}</td></tr>)}{!(rows||[]).length&&<tr><td colSpan={5}>No attendance recorded yet.</td></tr>}</tbody></table></div></section>
  </AdminShell>;
}
