import Link from "next/link";
import {currentUser} from "@/lib/auth";
import {signOut} from "@/app/actions/auth";
export const dynamic="force-dynamic";
export default async function Pending(){const user=await currentUser();return <main className="container section"><div className="card form-wrap narrow"><span className="emoji" aria-hidden="true">🌱</span><h1 style={{fontSize:"2.6rem"}}>Your account is being reviewed.</h1><p>Nicole will contact you once your enquiry has been approved. You'll then be able to complete your child's onboarding and view your private portal.</p>{user?<form action={signOut}><button className="btn secondary">Sign out</button></form>:<Link className="btn" href="/login">Sign in</Link>}</div></main>;}
