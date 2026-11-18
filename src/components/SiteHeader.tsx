import Link from "next/link";
export function SiteHeader() {
  return <header className="topbar"><div className="container nav">
    <Link className="brand" href="/"><img src="/branding/logo.svg" alt="Little Explorers logo"/><span>little explorers<small>Childminding • Livingston</small></span></Link>
    <nav className="navlinks" aria-label="Main navigation">
      <Link href="/#about">About</Link><Link href="/policies">Policies</Link><Link href="/christmas">Christmas</Link><Link href="/booking">Enquire</Link><Link className="btn small" href="/login">Parent portal</Link>
    </nav>
  </div></header>;
}
