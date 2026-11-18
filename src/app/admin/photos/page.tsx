import {requireAdmin} from "@/lib/auth";
import {supabaseAdmin} from "@/lib/supabase/admin";
import {AdminShell} from "@/components/AdminShell";
import {PhotoCards} from "@/components/PhotoCards";
export const metadata={title:"Private Photo Uploads",robots:{index:false}};
export default async function Photos(){await requireAdmin();const db=supabaseAdmin();
  const [{data:children},{data:photos}]=await Promise.all([db.from("children").select("id,name"),db.from("photos").select("id,child_id,caption,created_at").order("created_at",{ascending:false}).limit(60)]);
  return <AdminShell><span className="eyebrow">Secure family galleries</span><h1>Child photos</h1><p>Photos are private and only visible to authorised parents where photo consent is currently enabled.</p>
    <section className="card" style={{margin:"1.5rem 0"}}><h3>Upload a photo</h3><div className="alert">Upload individual-child images only. Verify consent and avoid including other children in the image.</div>
      <form className="stack" action="/api/admin/photos" method="post" encType="multipart/form-data" style={{marginTop:"1rem"}}>
        <div className="field"><label htmlFor="child_id">Child</label><select id="child_id" name="child_id">{(children||[]).map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
        <div className="field"><label htmlFor="photo">Photo (JPG, PNG or WebP, max 3 MB)</label><input id="photo" name="photo" type="file" accept="image/jpeg,image/png,image/webp" required/></div>
        <div className="field"><label htmlFor="caption">Caption</label><input id="caption" name="caption" maxLength={180}/></div>
        <button className="btn" disabled={!(children||[]).length}>Upload securely</button>
      </form>
    </section>
    <section className="card"><h3>Recent uploads</h3><PhotoCards photos={photos||[]} names={Object.fromEntries((children||[]).map(c=>[c.id,c.name]))}/></section>
  </AdminShell>;
}
