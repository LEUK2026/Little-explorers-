import {requireParent} from "@/lib/auth";
import {ParentShell} from "@/components/ParentShell";
import {acknowledgeIncident} from "@/app/actions/parent";
import {ukDate} from "@/lib/format";
export const metadata={title:"Your Incident Reports"};
export default async function Incidents(){const {user,supabase}=await requireParent();
  const [{data:children},{data:incidents},{data:acks}]=await Promise.all([supabase.from("children").select("id,name"),supabase.from("incidents").select("*").order("happened_on",{ascending:false}).limit(100),supabase.from("incident_acknowledgements").select("incident_id").eq("parent_id",user.id)]);
  const names=new Map((children||[]).map(c=>[c.id,c.name]));const acknowledged=new Set((acks||[]).map(a=>a.incident_id));
  return <ParentShell><span className="eyebrow">Important updates</span><h1>Incident reports</h1><p>Read reports about your child and acknowledge that you've received them.</p>
    <div className="stack">{(incidents||[]).map(i=><article className="card" key={i.id}><span className="tag">{names.get(i.child_id)}</span><h3 style={{marginTop:"1rem"}}>{i.title}</h3><small>{ukDate(i.happened_on)}</small><p><strong>What happened:</strong> {i.description}</p><p><strong>Action taken:</strong> {i.action_taken}</p>
      {acknowledged.has(i.id)?<span className="tag">✓ Acknowledged</span>:<form action={acknowledgeIncident}><input type="hidden" name="incident_id" value={i.id}/><button className="btn small">I have read this report</button></form>}</article>)}{!(incidents||[]).length&&<p className="card">No incident reports for your family.</p>}</div>
  </ParentShell>;
}
