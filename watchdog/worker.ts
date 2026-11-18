// Stand-alone Cloudflare Worker; NOT deployed as part of either Vercel project.
// Own database = status page stays up when Supabase or the childcare site is down.
type Query = { bind(...args:unknown[]):Query; first<T=Record<string,unknown>>():Promise<T|null>; run():Promise<unknown>; all<T=Record<string,unknown>>():Promise<{results:T[]}> };
type DB = { prepare(sql:string):Query };
type Env={STATUS_DB:DB;SITE_A_URL:string;SITE_B_URL:string;HEALTH_CHECK_SECRET:string;TELEGRAM_BOT_TOKEN?:string;TELEGRAM_CHAT_ID?:string};
type SiteState={database:boolean;invoices:boolean;resend:boolean;gocardless:boolean};
const labels:Record<string,string>={website_a:"Main website",website_b:"Standby website",database:"Parent database",invoices:"Invoice scheduler",resend:"Email service",gocardless:"GoCardless payments"};

async function probe(url:string,secret?:string):Promise<{ok:boolean;details?:SiteState}>{
  try{
    const target=new URL(url);
    if(target.protocol!=="https:")return {ok:false};
    const response=await fetch(target.toString(),{headers:secret?{"x-health-secret":secret}:{},signal:AbortSignal.timeout(7000),redirect:"error"});
    if(!response.ok)return {ok:false};
    const json=await response.json() as Record<string,unknown>;
    return secret?{ok:true,details:json as SiteState}:{ok:json.status==="ok"};
  }catch{return {ok:false};}
}

async function notify(env:Env,message:string){
  if(!env.TELEGRAM_BOT_TOKEN||!env.TELEGRAM_CHAT_ID)return;
  try{await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`,{
    method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({chat_id:env.TELEGRAM_CHAT_ID,text:message}),signal:AbortSignal.timeout(5000),
  });}catch{/* alerts are best-effort; primary state is always recorded in D1 */}
}

async function persist(env:Env,name:string,healthy:boolean,at:string){
  const current=await env.STATUS_DB.prepare("select state,consecutive_failures from checks where name=?").bind(name).first<{state:string;consecutive_failures:number}>();
  const failures=healthy?0:(current?.consecutive_failures||0)+1;
  const state=healthy?"operational":failures>=2?"down":"degraded";
  await env.STATUS_DB.prepare("insert into checks(name,state,consecutive_failures,checked_at) values(?,?,?,?) on conflict(name) do update set state=excluded.state,consecutive_failures=excluded.consecutive_failures,checked_at=excluded.checked_at")
    .bind(name,state,failures,at).run();
  await env.STATUS_DB.prepare("insert into history(name,state,checked_at) values(?,?,?)").bind(name,state,at).run();
  if(current?.state!==state&&state==="down"){
    await env.STATUS_DB.prepare("insert into incidents(name,opened_at) values(?,?)").bind(name,at).run();
    await notify(env,`Little Explorers alert: ${labels[name]} is DOWN (${at}).`);
  }
  if(current?.state==="down"&&state==="operational"){
    await env.STATUS_DB.prepare("update incidents set resolved_at=? where name=? and resolved_at is null").bind(at,name).run();
    await notify(env,`Little Explorers recovery: ${labels[name]} is operational (${at}).`);
  }
}

async function checkAll(env:Env){
  const at=new Date().toISOString();
  const a=env.SITE_A_URL.replace(/\/$/,"");const b=env.SITE_B_URL.replace(/\/$/,"");
  const [probeA,probeB]=await Promise.all([probe(`${a}/api/health`),probe(`${b}/api/health`)]);
  await Promise.all([persist(env,"website_a",probeA.ok,at),persist(env,"website_b",probeB.ok,at)]);
  // Check the back-end from whichever site responds first; keeps monitoring during failover.
  const origin=probeA.ok?a:probeB.ok?b:null;
  const deps=origin?await probe(`${origin}/api/health/internal`,env.HEALTH_CHECK_SECRET):{ok:false};
  for(const name of ["database","invoices","resend","gocardless"] as const){
    await persist(env,name,Boolean(deps.ok&&deps.details?.[name]),at);
  }
  // Trim detailed history after 30 days; incidents remain for review.
  await env.STATUS_DB.prepare("delete from history where checked_at < ?").bind(new Date(Date.now()-30*86400000).toISOString()).run();
}

const htmlEscape=(text:string)=>text.replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[c]||c);
export default {
  async scheduled(_event:unknown,env:Env,ctx:{waitUntil(p:Promise<unknown>):void}){ctx.waitUntil(checkAll(env));},
  async fetch(request:Request,env:Env){
    if(request.method!=="GET")return new Response("Method not allowed",{status:405});
    const url=new URL(request.url);
    if(url.pathname!=="/")return new Response("Not found",{status:404});
    const {results}=await env.STATUS_DB.prepare("select name,state,checked_at from checks order by name").all<{name:string;state:string;checked_at:string}>();
    const rows=results.filter(r=>labels[r.name]);
    const map=new Map(rows.map(r=>[r.name,r]));
    const primary=map.get("website_a")?.state;const standby=map.get("website_b")?.state;
    const overall=rows.length<Object.keys(labels).length?"Monitoring is starting":primary==="down"&&standby==="down"?"Major outage":rows.some(r=>r.state!=="operational")?"Some services affected":"All systems operational";
    if(url.searchParams.get("format")==="json")return Response.json({overall,services:rows.map(r=>({name:labels[r.name],state:r.state,checkedAt:r.checked_at}))},{headers:{"Cache-Control":"no-store"}});
    const cards=Object.entries(labels).map(([id,label])=>{const row=map.get(id);const state=row?.state||"unknown";
      return `<div class="item"><span>${htmlEscape(label)}</span><b class="${state}">${htmlEscape(state)}</b></div>`;}).join("");
    const {results:incidents}=await env.STATUS_DB.prepare("select name,opened_at,resolved_at from incidents order by opened_at desc limit 10").all<{name:string;opened_at:string;resolved_at:string|null}>();
    const history=incidents.map(i=>`<li>${htmlEscape(labels[i.name]||i.name)}: ${htmlEscape(i.resolved_at?"Recovered":"Investigating")} · ${htmlEscape(i.opened_at)}</li>`).join("");
    const page=`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Little Explorers — Service Status</title><style>body{font:16px system-ui;background:#f6f7f1;color:#244434;margin:0}.wrap{max-width:760px;margin:70px auto;padding:0 22px}h1{font:48px Georgia,serif}.panel{background:white;padding:26px;border-radius:18px;box-shadow:0 8px 40px #17362710;margin:20px 0}.item{padding:14px 0;border-bottom:1px solid #e0e7dd;display:flex;justify-content:space-between;gap:18px}.item:last-child{border:0}b{font-size:14px;text-transform:capitalize}.operational{color:#27814c}.degraded,.unknown{color:#ab762c}.down{color:#b3332c}small{color:#647267}li{margin:9px 0}</style></head><body><main class="wrap"><small>LITTLE EXPLORERS · LIVINGSTON</small><h1>Service status</h1><div class="panel"><h2>${htmlEscape(overall)}</h2><p>Independent monitoring of the website, family portal, payments, email and invoicing.</p></div><div class="panel">${cards}</div><div class="panel"><h2>Recent incidents</h2><ul>${history||"<li>No incidents recorded.</li>"}</ul></div><small>Checks run approximately every five minutes. Public service health only — no family data appears here.</small></main></body></html>`;
    return new Response(page,{headers:{"content-type":"text/html; charset=utf-8","cache-control":"no-store","x-content-type-options":"nosniff","content-security-policy":"default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; frame-ancestors 'none'"}});
  },
};
