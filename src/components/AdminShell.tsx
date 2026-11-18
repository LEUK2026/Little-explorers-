import {WorkspaceNav} from "@/components/WorkspaceNav";
export function AdminShell({children}:{children:React.ReactNode}){return <main className="container page-grid"><WorkspaceNav admin/><div className="page-main">{children}</div></main>;}
