import type { Metadata } from "next";
import { registerParent } from "@/app/actions/auth";
export const metadata: Metadata = { title: "Enquire & Create Parent Account" };

export default async function Booking({searchParams}:{searchParams: Promise<{error?:string}>}) {
  const {error} = await searchParams;
  return <main><div className="page-head"><div className="container"><span className="eyebrow">Join Little Explorers</span><h1>Start your adventure.</h1><p>Tell us a little about your family to create an account and send your childcare enquiry to Nicole.</p></div></div>
    <div className="container"><div className="card form-wrap"><h2 style={{fontSize:"2rem"}}>Your enquiry</h2><p>After submitting, please confirm your email. Nicole will review availability and approve your account.</p>
      {error && <p className="alert error" role="alert">{error==="try-later"?"Too many attempts. Please try again later.":"Please review all fields and accept the declaration."}</p>}
      <form action={registerParent} className="stack">
        <div className="grid2"><div className="field"><label htmlFor="full_name">Your full name *</label><input id="full_name" name="full_name" minLength={2} maxLength={120} required autoComplete="name"/></div><div className="field"><label htmlFor="email">Email address *</label><input id="email" name="email" type="email" required autoComplete="email"/></div></div>
        <div className="field"><label htmlFor="phone">Phone number *</label><input id="phone" name="phone" type="tel" required autoComplete="tel"/></div>
        <div className="field"><label htmlFor="password">Create a password *</label><input id="password" name="password" type="password" minLength={12} maxLength={128} required autoComplete="new-password"/><small>Use a unique password of at least 12 characters.</small></div>
        <div className="grid2"><div className="field"><label htmlFor="child_name">Child's first name *</label><input id="child_name" name="child_name" minLength={2} maxLength={120} required/></div><div className="field"><label htmlFor="requested_start">Preferred start date</label><input id="requested_start" name="requested_start" type="date"/></div></div>
        <div className="field"><label htmlFor="message">Anything else we should know?</label><textarea id="message" name="message" maxLength={2000}/></div>
        <label className="checkline"><input type="checkbox" name="consent" value="yes" required/><span>I understand this is an enquiry, not a confirmed childcare booking. I agree that Little Explorers may use these details to respond to my enquiry and create my account.</span></label>
        <button className="btn" type="submit">Send enquiry & create account →</button>
      </form>
    </div></div>
  </main>;
}
