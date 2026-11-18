import type {Metadata} from "next";
import {LoginForm} from "@/components/LoginForm";
export const metadata:Metadata={title:"Parent Sign In",robots:{index:false}};
export default async function Login({searchParams}:{searchParams:Promise<{error?:string}>}){const p=await searchParams;return <main className="container"><LoginForm showError={!!p.error}/></main>;}
