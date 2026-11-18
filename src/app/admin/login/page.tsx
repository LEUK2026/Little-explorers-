import type {Metadata} from "next";
import {LoginForm} from "@/components/LoginForm";
export const metadata:Metadata={title:"Admin Sign In",robots:{index:false}};
export default async function Login({searchParams}:{searchParams:Promise<{error?:string}>}){const p=await searchParams;return <main className="container"><LoginForm admin showError={!!p.error}/></main>;}
