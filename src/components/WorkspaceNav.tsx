import Link from "next/link";
import {signOut} from "@/app/actions/auth";
export function WorkspaceNav({admin}:{admin:boolean}){
  const links=admin?
    [["/admin","Dashboard"],["/admin/parents","Parents & enquiries"],["/admin/onboarding","Child onboarding"],["/admin/attendance","Attendance"],["/admin/incidents","Incident reports"],["/admin/photos","Photos"],["/admin/invoices","Invoices"]]:
    [["/portal","My dashboard"],["/portal/onboarding","Onboarding"],["/portal/attendance","Attendance"],["/portal/incidents","Incident reports"],["/portal/photos","Photo gallery"],["/portal/invoices","Invoices & payments"]];
  return <aside className="sidebar"><h2>{admin?"Admin workspace":"Family workspace"}</h2><nav aria-label={admin?"Admin sections":"Parent sections"}>{links.map(([url,title])=><Link key={url} href={url}>{title}</Link>)}</nav>
    <form action={signOut}><button className="btn small secondary" style={{marginTop:"1rem"}}>Sign out</button></form>
  </aside>;
}
