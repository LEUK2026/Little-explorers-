import {requireAdmin} from "@/lib/auth";
import {supabaseAdmin} from "@/lib/supabase/admin";
import {AdminShell} from "@/components/AdminShell";
import {ukDate} from "@/lib/format";
export const metadata={title:"Child Onboarding Records",robots:{index:false}};
export default async function Onboarding(){await requireAdmin();const db=supabaseAdmin();
  const [{data:children},{data:onboarding}]=await Promise.all([db.from("children").select("id,name").order("name"),db.from("child_onboarding").select("*").limit(100)]);
  const records=new Map((onboarding||[]).map(r=>[r.child_id,r]));
  return <AdminShell><span className="eyebrow">Private child records</span><h1>Child onboarding</h1><p>Information shared by approved parents. Treat medical, development and contact details as confidential.</p>
    <div className="stack">{(children||[]).map(child=>{const r=records.get(child.id);return <section className="card" key={child.id}><h3>{child.name}</h3>{!r?<p className="tag warning">Awaiting parent onboarding</p>:<>
      <p className="tag">Review due {ukDate(r.review_due_on)}</p><div className="grid2" style={{marginTop:"1rem"}}>
        <div><small>Date of birth</small><p>{ukDate(r.date_of_birth)}</p></div><div><small>Emergency contact</small><p>{r.emergency_contact}</p></div>
        <div><small>Home address</small><p>{r.address}</p></div><div><small>Medical information</small><p>{r.medical_information||"None provided"}</p></div>
        <div><small>Permissions</small><p>Sunscreen: {r.sunscreen_allowed?"Yes":"No"}<br/>Outings: {r.outings_allowed?"Yes":"No"}<br/>Photos: {r.photo_consent?"Yes":"No"}</p></div>
        <div><small>Special needs</small><p>{r.special_needs?r.special_needs_details:"None specified"}</p></div>
        <div><small>Development support</small><p>{r.areas_to_support||"Not specified"}</p></div><div><small>Sleeping routine</small><p>{r.sleeping_routine||"Not specified"}</p></div>
        <div><small>Feeding and eating</small><p>{r.feeding_eating||"Not specified"}</p></div>
      </div></>}</section>;})}{!(children||[]).length&&<p>No child records yet.</p>}</div>
  </AdminShell>;
}
