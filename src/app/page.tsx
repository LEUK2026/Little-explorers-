import Link from "next/link";

export default function Home() {
  return <main>
    <section className="hero"><div className="container hero-grid">
      <div><span className="eyebrow">A little wonder, every day</span>
        <h1>Big adventures for <em>little explorers.</em></h1>
        <p>Thoughtful, nurturing childminding in Livingston, Scotland — a happy place for curious minds, growing confidence and discovering the world.</p>
        <div className="hero-actions"><Link href="/booking" className="btn">Enquire about a place ↗</Link><Link href="/#about" className="btn secondary">Discover more</Link></div>
      </div>
      <div className="hero-art" aria-hidden="true"><span className="star one">✦</span><div className="art-circle"><span className="art-inner">🌿</span></div><span className="star two">✧</span></div>
    </div></section>
    <section className="section" id="about"><div className="container">
      <div className="section-heading"><span className="eyebrow">Welcome to Little Explorers</span><h2>Where care, play and discovery grow together.</h2><p>Every day brings opportunities for children to play, explore, learn and feel part of a caring community.</p></div>
      <div className="grid3">
        <article className="card"><span className="emoji" aria-hidden="true">🧸</span><h3>Nurturing care</h3><p>A welcoming, encouraging environment that puts each child’s wellbeing first.</p></article>
        <article className="card"><span className="emoji" aria-hidden="true">🍃</span><h3>Everyday adventures</h3><p>Opportunities to discover outdoors, play creatively and develop new skills.</p></article>
        <article className="card"><span className="emoji" aria-hidden="true">🏡</span><h3>Parents kept close</h3><p>Our private parent portal provides attendance, updates, reports and invoices in one place.</p></article>
      </div>
    </div></section>
    <section className="section pale"><div className="container soft-banner"><div><span className="eyebrow">For parents</span><h2>Your child's day, close at hand.</h2><p>View attendance, onboarding records, invoices and photo updates securely from your phone.</p></div><Link className="btn" href="/login">Open parent portal</Link></div></section>
    <section className="section"><div className="container"><div className="section-heading"><span className="eyebrow">Ready to explore?</span><h2>Let's get to know your family.</h2><p>Send an enquiry to create an account. We'll review your request and be in touch about availability.</p></div><Link className="btn" href="/booking">Make an enquiry</Link></div></section>
  </main>;
}
