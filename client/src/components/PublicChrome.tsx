/** Material Trace public chrome: a compact, consistent route through Reborn Tech's evidence pages. */
import { useState } from "react";
import { ArrowUpRight, Menu, X } from "lucide-react";

const logo = "/manus-storage/reborn-tech-loop-mark_02435898.png";

const navigation = [
  { href: "/services", label: "Services" },
  { href: "/security", label: "Security" },
  { href: "/impact", label: "Impact" },
  { href: "/#locations", label: "Locations" },
  { href: "/portal", label: "Customer portal", portal: true },
  { href: "/operations", label: "Operations" },
];

export function SiteHeader({ active }: { active?: string }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const closeMenu = () => setMenuOpen(false);

  return (
    <header className="site-header">
      <a className="brand-lockup" href="/" aria-label="Reborn Tech home" onClick={closeMenu}>
        <span className="brand-mark-field"><img className="brand-mark" src={logo} alt="" /></span>
        <span className="brand-name">REBORN<span>TECH</span></span>
      </a>
      <nav className={`site-nav ${menuOpen ? "is-open" : ""}`} aria-label="Primary navigation">
        {navigation.map((item) => <a className={active === item.label ? "is-active" : ""} key={item.label} href={item.href} onClick={closeMenu}>{item.label}{item.portal && <ArrowUpRight size={14} />}</a>)}
      </nav>
      <div className="header-actions">
        <a className="header-cta" href="/#contact">Start an asset journey <ArrowUpRight size={15} /></a>
        <button className="menu-toggle" onClick={() => setMenuOpen((open) => !open)} aria-label="Toggle menu" aria-expanded={menuOpen}>{menuOpen ? <X size={23} /> : <Menu size={23} />}</button>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <a className="brand-lockup footer-brand" href="/" aria-label="Reborn Tech home"><span className="brand-mark-field"><img className="brand-mark" src={logo} alt="" /></span><span className="brand-name">REBORN<span>TECH</span></span></a>
      <p>Secure ITAD. Second life, verified.</p>
      <div><a href="/operations">Operations access</a><a href="/privacy">Privacy information</a><span>Powered by Bulk GSM capability</span><span>© {new Date().getFullYear()} Reborn Tech</span></div>
    </footer>
  );
}
