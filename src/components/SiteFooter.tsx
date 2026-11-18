import Link from "next/link";
export function SiteFooter() {
  return <footer className="footer"><div className="container footer-grid">
    <div><strong>Little Explorers</strong><p>Warm, welcoming childminding in Livingston, Scotland.</p><small>© {new Date().getFullYear()} Little Explorers</small></div>
    <nav className="navlinks" aria-label="Footer navigation"><Link href="/policies">Policies</Link><Link href="/booking">Enquiries</Link><Link href="/login">Parent login</Link><Link href="/admin/login">Admin login</Link>{process.env.NEXT_PUBLIC_STATUS_PAGE_URL?.startsWith("https://")&&<a href={process.env.NEXT_PUBLIC_STATUS_PAGE_URL} target="_blank" rel="noopener noreferrer">Service status</a>}</nav>
  </div></footer>;
}
