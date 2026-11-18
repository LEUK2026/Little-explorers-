import {requireAdmin} from "@/lib/auth";
import {supabaseAdmin} from "@/lib/supabase/admin";
import {AdminShell} from "@/components/AdminShell";
import {recordIncident} from "@/app/actions/admin";
import {ukDate} from "@/lib/format";
export const metadata={title:"Incident Reports",robots:{index:false}};
export default async function Incidents(){await requireAdmin();const db=supabaseAdmin();
  const [{data:children},{data:rows},{data:acks}]=await Promise.all([db.from("children").select("id,name").order("name"),db.from("incidents").select("*").order("happened_on",{ascending:false}).limit(100),db.from("incident_acknowledgements").select("incident_id,acknowledged_at")]);
  const names=new Map((children||[]).map(c=>[c.id,c.name]));const acknowledge=new Set((acks||[]).map(a=>a.incident_id));
  return <AdminShell><span className="eyebrow">Safeguarding records</span><h1>Incident reports</h1><p>Keep factual reports and actions taken. The relevant parent can read and acknowledge each report privately.</p>
    <section className="card" style={{margin:"1.5rem 0"}}><h3>Record a new report</h3><form action={recordIncident} className="stack">
      <div className="field"><label htmlFor="child_id">Child</label><select id="child_id" name="child_id" required>{(children||[]).map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
      <div className="field"><label htmlFor="happened_on">Date</label><input id="happened_on" name="happened_on" type="date" required/></div>
      <div className="field"><label htmlFor="title">Short title</label><input id="title" name="title" minLength={3} maxLength={180} required/></div>
      <div className="field"><label htmlFor="description">What happened?</label><textarea id="description" name="description" minLength={10} maxLength={6000} required/></div>
      <div className="field"><label htmlFor="action_taken">Action taken</label><textarea id="action_taken" name="action_taken" minLength={5} maxLength={6000} required/></div>
      <button className="btn" disabled={!(children||[]).length}>Save incident report</button>
    </form></section>
    <section className="card"><h3>Recent reports</h3><div className="stack">{(rows||[]).map(r=><article key={r.id} style={{borderBottom:"1px solid var(--line)",paddingBottom:"1rem"}}><span className="tag">{names.get(r.child_id)}</span><h3 style={{marginTop:".7rem"}}>{r.title}</h3><small>{ukDate(r.happened_on)} · {acknowledge.has(r.id)?"Acknowledged by parent":"Awaiting parent acknowledgement"}</small><p><strong>Report:</strong> {r.description}</p><p><strong>Action taken:</strong> {r.action_taken}</p></article>)}{!(rows||[]).length&&<p>No incident reports.</p>}</div></section>
  </AdminShell>;
}
