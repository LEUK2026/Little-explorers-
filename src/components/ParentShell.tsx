import {WorkspaceNav} from "@/components/WorkspaceNav";
export function ParentShell({children}:{children:React.ReactNode}){return <main className="container page-grid"><WorkspaceNav admin={false}/><div className="page-main">{children}</div></main>;}
