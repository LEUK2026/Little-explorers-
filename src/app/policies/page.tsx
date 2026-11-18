import type { Metadata } from "next";
export const metadata: Metadata = { title: "Policies" };
const policies = [
  ["Safeguarding & child protection", "Children's safety and wellbeing come first. Concerns will be recorded and handled in accordance with our approved safeguarding procedures and relevant Scottish guidance."],
  ["Illness, medication & allergies", "Parents should tell us about medical needs, allergies and illness. Medication will be handled only under our approved policy and with appropriate consent and records."],
  ["Accidents & incidents", "We record incidents accurately and make reports available securely to the relevant family. Parents can acknowledge having read each report."],
  ["Attendance & collection", "Only authorised people may collect children. Attendance and collection times are recorded for safeguarding and billing purposes."],
  ["Fees, absences & cancellations", "Fees are based on agreed hourly rates and the written childcare agreement. Funded hours, closures, late collections and cancellations must be specified in the signed agreement."],
  ["Privacy, photographs & retention", "Children's information and photographs are private. Access is restricted to authorised parents and staff. Photo permissions are recorded in each child's onboarding form."],
  ["Complaints & feedback", "We welcome feedback and provide a clear route for raising concerns. Our approved complaints policy will explain how concerns are acknowledged and escalated."],
];
export default function Policies() { return <main>
  <div className="page-head"><div className="container"><span className="eyebrow">Clarity and care</span><h1>Our policies</h1><p>How we look after children, communicate with parents and operate responsibly.</p></div></div>
  <div className="container section"><div className="alert"><strong>Owner review required before launch:</strong> These are website summaries and placeholders, not the business's full legal policies. Nicole must replace/approve them alongside the formal childcare policy documents and privacy notice.</div>
    <div className="grid2" style={{marginTop:"2rem"}}>{policies.map(([title, body])=><section className="card" key={title}><h3>{title}</h3><p>{body}</p></section>)}</div>
  </div>
</main>; }
