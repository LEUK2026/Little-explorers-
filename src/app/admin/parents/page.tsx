import {requireAdmin} from "@/lib/auth";
import {supabaseAdmin} from "@/lib/supabase/admin";
import {pounds,ukDate} from "@/lib/format";
import {AdminShell} from "@/components/AdminShell";
import {approveEnquiry,rejectEnquiry,retryApprovalEmail,setChildRate,addChild} from "@/app/actions/admin";
export const metadata={title:"Manage Parents",robots:{index:false}};
export default async function Parents(){await requireAdmin();const db=supabaseAdmin();
  const [{data:enquiries},{data:profiles},{data:children}]=await Promise.all([
    db.from("enquiries").select("*").order("created_at",{ascending:false}).limit(100),
    db.from("profiles").select("id,full_name,email,phone,approved"),
    db.from("children").select("id,parent_id,name,hourly_rate_pence").order("name"),
  ]);
  const parents=new Map((profiles||[]).map(p=>[p.id,p]));
  return <AdminShell><span className="eyebrow">Family administration</span><h1>Parents & enquiries</h1><p>Review every request before allowing parents into the private portal.</p>
    <section className="card" style={{margin:"1.5rem 0"}}><h3>Enquiries</h3><div className="overflow"><table className="data"><thead><tr><th>Parent</th><th>Child / enquiry</th><th>Status</th><th>Action</th></tr></thead><tbody>
      {(enquiries||[]).map(e=><tr key={e.id}><td><strong>{parents.get(e.parent_id)?.full_name||"Parent"}</strong><br/><small>{parents.get(e.parent_id)?.email}</small><br/><small>{parents.get(e.parent_id)?.phone}</small></td>
        <td>{e.child_name}<br/><small>Start: {e.requested_start?ukDate(e.requested_start):"Not specified"}</small><br/><small>{e.message}</small></td>
        <td><span className={`tag ${e.status==="pending"?"warning":""}`}>{e.status}</span>{e.status==="approved"&&!e.approval_email_sent_at&&<p><small>Approval email not sent</small></p>}</td>
        <td>{e.status==="pending"?<><form action={approveEnquiry}><input type="hidden" name="enquiry_id" value={e.id}/><button className="btn small">Approve</button></form><form action={rejectEnquiry} style={{marginTop:".5rem"}}><input type="hidden" name="enquiry_id" value={e.id}/><button className="btn small secondary">Reject</button></form></>:e.status==="approved"&&!e.approval_email_sent_at?<form action={retryApprovalEmail}><input type="hidden" name="enquiry_id" value={e.id}/><button className="btn small secondary">Retry email</button></form>:"—"}</td>
      </tr>)}
      {!(enquiries||[]).length&&<tr><td colSpan={4}>No enquiries yet.</td></tr>}
    </tbody></table></div></section>
    <section className="card"><h3>Children & hourly rates</h3><p className="muted">Rates apply to new attendance. Older attendance keeps its original recorded rate.</p><div className="overflow"><table className="data"><thead><tr><th>Child</th><th>Parent</th><th>Current rate</th><th>Update</th></tr></thead><tbody>
      {(children||[]).map(c=><tr key={c.id}><td>{c.name}</td><td>{parents.get(c.parent_id)?.full_name||"—"}</td><td>{pounds(c.hourly_rate_pence)}</td>
        <td><form action={setChildRate} className="tabs"><input type="hidden" name="child_id" value={c.id}/><label className="field">New rate (£/hour)<input aria-label={`Hourly rate for ${c.name}`} name="hourly_rate" type="number" step="0.01" min="0.01" max="500" defaultValue={(c.hourly_rate_pence/100).toFixed(2)} required style={{maxWidth:"120px"}}/></label><button className="btn small" type="submit">Save</button></form></td></tr>)}
      {!(children||[]).length&&<tr><td colSpan={4}>No approved child records yet.</td></tr>}
    </tbody></table></div></section>
    <section className="card" style={{marginTop:"1.5rem"}}><h3>Add another child to a family</h3><p>For siblings or additional placements. The parent will then see a new onboarding form.</p><form action={addChild} className="stack">
      <div className="field"><label htmlFor="parent_id">Approved parent</label><select name="parent_id" id="parent_id" required>{(profiles||[]).filter(p=>p.approved).map(p=><option key={p.id} value={p.id}>{p.full_name} ({p.email})</option>)}</select></div>
      <div className="field"><label htmlFor="child_name">Child's name</label><input name="child_name" id="child_name" required minLength={2} maxLength={120}/></div><button className="btn" type="submit">Add child</button>
    </form></section>
  </AdminShell>;
}
