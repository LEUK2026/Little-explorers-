import {requireAdmin} from "@/lib/auth";
import {supabaseAdmin} from "@/lib/supabase/admin";
import {AdminShell} from "@/components/AdminShell";
import {generateDrafts,refreshDraft,issueDraft,collectInvoice,recordBankPayment} from "@/app/actions/admin";
import {pounds,ukDate} from "@/lib/format";
import {previousMonth} from "@/lib/billing";
export const metadata={title:"Invoice Management",robots:{index:false}};
export default async function Invoices(){await requireAdmin();const db=supabaseAdmin();
  const [{data:invoices},{data:parents},{data:mandates}]=await Promise.all([
    db.from("invoices").select("*").order("created_at",{ascending:false}).limit(100),
    db.from("profiles").select("id,full_name,email"),
    db.from("mandates").select("parent_id"),
  ]);
  const names=new Map((parents||[]).map(p=>[p.id,p.full_name]));const hasMandate=new Set((mandates||[]).map(m=>m.parent_id));const prev=previousMonth(new Date());
  return <AdminShell><span className="eyebrow">Accounts & payments</span><h1>Invoices</h1><p>Create monthly drafts from approved attendance, review them, and issue or collect payments.</p>
    <div className="alert"><strong>Payment safety:</strong> Automatic draft generation never collects money. Direct Debit is initiated only by an administrator using the Collect button. Test in GoCardless sandbox before using live credentials.</div>
    <section className="card" style={{margin:"1.5rem 0"}}><h3>Generate invoice drafts</h3><p>One draft per family, for the selected complete calendar month. Repeating this action does not duplicate invoices.</p>
      <form action={generateDrafts} className="tabs"><div className="field"><label htmlFor="month">Billing month</label><input type="month" name="month" id="month" defaultValue={prev.start.slice(0,7)} required/></div><button className="btn">Generate drafts</button></form>
    </section>
    <section className="card"><h3>Recent invoices</h3><div className="overflow"><table className="data"><thead><tr><th>Invoice</th><th>Family</th><th>Total</th><th>Status</th><th>Actions</th></tr></thead><tbody>
      {(invoices||[]).map(i=><tr key={i.id}><td><strong>LE-{i.invoice_number}</strong><br/><small>{ukDate(i.period_start)} – {ukDate(i.period_end)}</small><br/><a href={`/api/invoices/${i.id}/pdf`} target="_blank" rel="noopener noreferrer">PDF ↓</a></td>
        <td>{names.get(i.parent_id)}</td><td>{pounds(i.total_pence)}</td><td><span className="tag">{i.status}</span>{i.status==="issued"&&!i.email_sent_at&&<p><small>Email not sent</small></p>}</td>
        <td><div className="stack">
          {i.status==="draft"&&<form action={refreshDraft}><input name="invoice_id" type="hidden" value={i.id}/><button className="btn small secondary">Refresh draft</button></form>}
          {(i.status==="draft"||(i.status==="issued"&&!i.email_sent_at))&&<form action={issueDraft}><input name="invoice_id" type="hidden" value={i.id}/><button className="btn small">{i.status==="draft"?"Approve & email":"Retry email"}</button></form>}
          {i.status==="issued"&&hasMandate.has(i.parent_id)&&<form action={collectInvoice}><input name="invoice_id" type="hidden" value={i.id}/><button className="btn small secondary">Collect Direct Debit</button></form>}
          {i.status==="issued"&&!i.gocardless_payment_id&&<form action={recordBankPayment}><input name="invoice_id" type="hidden" value={i.id}/><button className="btn small secondary">Mark bank paid</button></form>}
        </div></td>
      </tr>)}{!(invoices||[]).length&&<tr><td colSpan={5}>No invoices yet.</td></tr>}
    </tbody></table></div></section>
  </AdminShell>;
}
