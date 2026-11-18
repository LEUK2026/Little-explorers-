import Link from "next/link";
import {requireAdmin} from "@/lib/auth";
import {supabaseAdmin} from "@/lib/supabase/admin";
import {AdminShell} from "@/components/AdminShell";
export const metadata={title:"Admin Dashboard",robots:{index:false}};
export default async function Dashboard(){
  const {profile}=await requireAdmin();const db=supabaseAdmin();
  const [enquiries,children,attendance,invoices]=await Promise.all([
    db.from("enquiries").select("id",{count:"exact",head:true}).eq("status","pending"),
    db.from("children").select("id",{count:"exact",head:true}),
    db.from("attendance").select("id",{count:"exact",head:true}),
    db.from("invoices").select("id",{count:"exact",head:true}).eq("status","draft"),
  ]);
  return <AdminShell><span className="eyebrow">Restricted staff area</span><h1>Welcome back, {profile.full_name?.split(" ")[0]||"admin"}.</h1><p className="muted">Everything you need to run Little Explorers, securely in one place.</p>
    <div className="dashboard-cards" style={{margin:"2rem 0"}}>
      <div className="card"><small>Pending enquiries</small><span className="metric">{enquiries.count??"—"}</span></div>
      <div className="card"><small>Registered children</small><span className="metric">{children.count??"—"}</span></div>
      <div className="card"><small>Attendance records</small><span className="metric">{attendance.count??"—"}</span></div>
    </div>
    {(invoices.count??0)>0&&<p className="alert">There are {invoices.count} invoice drafts waiting for review.</p>}
    <div className="grid2">
      <div className="card"><h3>Family enquiries</h3><p>Approve applications and set each child's agreed hourly rate.</p><Link className="btn small" href="/admin/parents">Manage enquiries</Link></div>
      <div className="card"><h3>Billing & attendance</h3><p>Enter childcare sessions, generate monthly invoices and track payments.</p><Link className="btn small" href="/admin/attendance">Record attendance</Link></div>
      <div className="card"><h3>Incident reports</h3><p>Record incidents and check parent acknowledgements.</p><Link className="btn small" href="/admin/incidents">View reports</Link></div>
      <div className="card"><h3>Private photos</h3><p>Upload pictures for the relevant approved family only.</p><Link className="btn small" href="/admin/photos">Manage photos</Link></div>
    </div>
  </AdminShell>;
}
