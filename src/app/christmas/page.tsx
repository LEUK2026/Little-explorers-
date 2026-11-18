import type { Metadata } from "next";
export const metadata: Metadata = { title: "Christmas Adventures" };
// The advent calendar must evaluate the current UK date for every request.
export const dynamic = "force-dynamic";
const activities = ["Make a paper snowflake", "Spot five winter colours", "Read a cosy story", "Draw a friendly robin", "Make a kindness card", "Count five stars", "Dance to a festive tune", "Go on a winter walk", "Design a mitten", "Find something sparkly", "Make a paper chain", "Sing a favourite song", "Create a winter picture", "Build a blanket den", "Share a kind word", "Draw a Christmas tree", "Help tidy toys", "Look for the moon", "Make a homemade card", "Choose a bedtime story", "Play a counting game", "Invent a winter animal", "Tell a happy memory", "Celebrate together!"];
export default function Christmas() {
  const now = new Date();
  const london = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/London", year:"numeric", month:"numeric", day:"numeric" }).formatToParts(now);
  const parts = Object.fromEntries(london.map(p => [p.type,Number(p.value)]));
  const today = parts.month===12 ? Math.min(parts.day,24) : parts.month>12 ? 24 : 0;
  return <main><div className="page-head holiday"><div className="container"><span className="eyebrow">A season of wonder</span><h1>Little Christmas Explorers 🎄</h1><p>24 little moments of fun to share together. A new activity opens each December day.</p></div></div>
    <div className="container section"><div className="section-heading"><h2>Our advent activities</h2><p>Activities unlock based on the current date. No accounts, purchases or children's details required.</p></div>
      <div className="advent-grid">{activities.map((activity,index)=>{const open=index<today; return <div className="advent-day" key={index} aria-label={`December ${index+1}: ${open ? activity : "not yet unlocked"}`}><strong>{index+1}</strong><small>{open?activity:"🔒 Coming soon"}</small></div>;})}</div>
      <p className="muted" style={{marginTop:"1.5rem"}}>For December 1–24. Parents should supervise activities and adapt them to each child's age and needs.</p>
    </div>
  </main>;
}
