export function PhotoCards({photos,names}:{photos:Array<{id:string;child_id:string;caption:string}>;names:Record<string,string>}){
  return photos.length?<div className="photo-grid">{photos.map(p=><figure key={p.id} style={{margin:0}}><img className="photo-tile" src={`/api/photos/${p.id}`} alt={p.caption||`Photo for ${names[p.child_id]||"child"}`}/><figcaption><strong>{names[p.child_id]}</strong><br/><small>{p.caption}</small></figcaption></figure>)}</div>:<p>No photos uploaded yet.</p>;
}
