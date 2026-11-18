import {requireParent} from "@/lib/auth";
import {ParentShell} from "@/components/ParentShell";
import {pounds,ukDate} from "@/lib/format";
import {startMandate} from "@/app/actions/parent";
export const metadata={title:"Invoices & Payments"};
export default async function Invoices(){const {user,supabase}=await requireParent();
  const [{data:invoices},{data:mandate}]=await Promise.all([supabase.from("invoices").select("id,invoice_number,period_start,period_end,total_pence,status,due_on").order("created_at",{ascending:false}).limit(100),supabase.from("mandates").select("mandate_id").eq("parent_id",user.id).maybeSingle()]);
  const bank=[process.env.BANK_ACCOUNT_NAME,process.env.BANK_SORT_CODE,process.env.BANK_ACCOUNT_NUMBER].every(Boolean);
  return <ParentShell><span className="eyebrow">Simple, clear billing</span><h1>Invoices & payments</h1><p>Download your childcare invoices, manage Direct Debit, or use the bank transfer details provided by Little Explorers.</p>
    <div className="grid2" style={{margin:"1.5rem 0"}}><div className="card"><span className="emoji" aria-hidden="true">🏦</span><h3>Direct Debit</h3>{mandate?<p><span className="tag">Mandate configured</span><br/>Future invoices may be collected by GoCardless under the agreed terms.</p>:<><p>Set up your Direct Debit once, securely through GoCardless.</p><form action={startMandate}><button className="btn small">Set up Direct Debit</button></form></>}</div>
      <div className="card"><span className="emoji" aria-hidden="true">💷</span><h3>Bank transfer</h3>{bank?<p>Account name: <strong>{process.env.BANK_ACCOUNT_NAME}</strong><br/>Sort code: <strong>{process.env.BANK_SORT_CODE}</strong><br/>Account number: <strong>{process.env.BANK_ACCOUNT_NUMBER}</strong><br/><small>Reference: {process.env.BANK_REFERENCE_PREFIX||"LE"}-[invoice number]</small></p>:<p>Bank transfer details will appear here once configured by the business owner.</p>}</div></div>
    <section className="card"><h3>Your invoices</h3><div className="overflow"><table className="data"><thead><tr><th>Invoice</th><th>Period</th><th>Amount</th><th>Status</th><th>Download</th></tr></thead><tbody>{(invoices||[]).filter(i=>i.status!=="draft"&&i.status!=="void").map(i=><tr key={i.id}><td>LE-{i.invoice_number}</td><td>{ukDate(i.period_start)}–{ukDate(i.period_end)}</td><td>{pounds(i.total_pence)}</td><td><span className="tag">{i.status}</span><br/><small>Due {ukDate(i.due_on)}</small></td><td><a href={`/api/invoices/${i.id}/pdf`} target="_blank" rel="noopener noreferrer">Download PDF</a></td></tr>)}{!(invoices||[]).some(i=>i.status!=="draft"&&i.status!=="void")&&<tr><td colSpan={5}>No issued invoices yet.</td></tr>}</tbody></table></div></section>
  </ParentShell>;
}
