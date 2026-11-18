import {requireParent} from "@/lib/auth";
import {ParentShell} from "@/components/ParentShell";
import {saveOnboarding} from "@/app/actions/parent";
import {ukDate} from "@/lib/format";
import {SpecialNeedsFields} from "@/components/SpecialNeedsFields";
export const metadata={title:"Child Onboarding"};
function Choice({name,label,value}:{name:string;label:string;value?:boolean}){return <fieldset style={{border:"1px solid var(--line)",borderRadius:"12px",padding:".8rem"}}><legend style={{fontWeight:700}}>{label}</legend><label style={{marginRight:"1.5rem"}}><input type="radio" name={name} value="yes" defaultChecked={value===true} required/> Yes</label><label><input type="radio" name={name} value="no" defaultChecked={value===false} required/> No</label></fieldset>;}
export default async function Onboarding({searchParams}:{searchParams:Promise<{saved?:string}>}){
  const {supabase}=await requireParent();const params=await searchParams;
  const {data:children}=await supabase.from("children").select("id,name").order("name");
  const {data:records}=await supabase.from("child_onboarding").select("*");
  const byChild=new Map((records||[]).map(r=>[r.child_id,r]));
  return <ParentShell><span className="eyebrow">Child information</span><h1>Onboarding</h1><p>Please complete and review each child's details. The review date automatically falls six calendar months after you submit this form.</p>
    {params.saved&&<p className="alert">Your information has been saved securely.</p>}
    {(children||[]).map(child=>{const r=byChild.get(child.id);return <section className="card" style={{margin:"1.5rem 0"}} key={child.id}><h3>{child.name}</h3>{r?.review_due_on&&<p className="tag">Next review: {ukDate(r.review_due_on)}</p>}
      <form className="stack" action={saveOnboarding}><input type="hidden" name="child_id" value={child.id}/>
        <div className="field"><label>Date of birth *</label><input name="date_of_birth" type="date" defaultValue={r?.date_of_birth||""} required/></div>
        <div className="field"><label>Home address *</label><textarea name="address" minLength={5} maxLength={500} defaultValue={r?.address||""} required/></div>
        <div className="field"><label>Emergency contact name and phone *</label><input name="emergency_contact" minLength={5} maxLength={300} defaultValue={r?.emergency_contact||""} required/></div>
        <div className="field"><label>Medical information, allergies or medication</label><textarea name="medical_information" maxLength={4000} defaultValue={r?.medical_information||""}/></div>
        <Choice name="sunscreen_allowed" label="May sunscreen be applied?" value={r?.sunscreen_allowed}/>
        <Choice name="outings_allowed" label="May your child go on approved outings?" value={r?.outings_allowed}/>
        <Choice name="photo_consent" label="May individual photos of your child be shared in your secure family gallery?" value={r?.photo_consent}/>
        <SpecialNeedsFields initialYes={!!r?.special_needs} initialDetails={r?.special_needs_details||""}/>
        <div className="field"><label>Areas to support (e.g. speech or physical skills)</label><textarea name="areas_to_support" maxLength={4000} defaultValue={r?.areas_to_support||""}/></div>
        <div className="field"><label>Sleeping routine and preferences</label><textarea name="sleeping_routine" maxLength={4000} defaultValue={r?.sleeping_routine||""}/></div>
        <div className="field"><label>Feeding, eating and dietary preferences</label><textarea name="feeding_eating" maxLength={4000} defaultValue={r?.feeding_eating||""}/></div>
        <button type="submit" className="btn">Save {child.name}'s details</button>
      </form></section>;})}
    {!(children||[]).length&&<p className="alert">Your child record will appear here when Nicole has approved your enquiry.</p>}
  </ParentShell>;
}
