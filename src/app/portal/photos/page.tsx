import {requireParent} from "@/lib/auth";
import {ParentShell} from "@/components/ParentShell";
import {PhotoCards} from "@/components/PhotoCards";
export const metadata={title:"Private Photo Gallery"};
export default async function Photos(){const {supabase}=await requireParent();
  const [{data:children},{data:photos}]=await Promise.all([supabase.from("children").select("id,name"),supabase.from("photos").select("id,child_id,caption").order("created_at",{ascending:false}).limit(80)]);
  return <ParentShell><span className="eyebrow">Our little moments</span><h1>Photo gallery</h1><p>Your private gallery contains only photos that your family is authorised to access.</p><div className="card" style={{margin:"1.5rem 0"}}><PhotoCards photos={photos||[]} names={Object.fromEntries((children||[]).map(c=>[c.id,c.name]))}/></div></ParentShell>;
}
