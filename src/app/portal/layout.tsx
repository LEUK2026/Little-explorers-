import {requireParent} from "@/lib/auth";
export const dynamic="force-dynamic";
export const metadata={robots:{index:false}};
export default async function Layout({children}:{children:React.ReactNode}){await requireParent();return children;}
