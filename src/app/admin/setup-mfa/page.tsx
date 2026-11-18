import {requireAdmin} from "@/lib/auth";
import {AdminMfa} from "@/components/AdminMfa";
export const metadata={robots:{index:false}};
export default async function Setup(){await requireAdmin(false);return <main className="container"><AdminMfa/></main>;}
