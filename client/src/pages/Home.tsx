/**
 * Material Trace design system: industrial editorial ITAD storytelling.
 * Charcoal / warm-paper foundation; Signal Lime is reserved for route, proof and action.
 * Structure follows an asset journey, not a conventional centralised marketing grid.
 */
import { useState } from "react";
import {
  ArrowUpRight,
  Check,
  ChevronRight,
  FileCheck2,
  HeartHandshake,
  Menu,
  Route,
  ScanLine,
  ShieldCheck,
  X,
} from "lucide-react";
import { toast } from "sonner";

const ASSETS = {
  hero: "/manus-storage/reborn-itad-hero-asset-journey_e654ae29.jpg",
  processing: "/manus-storage/reborn-itad-secure-processing_e2cbfd90.jpg",
  renewal: "/manus-storage/reborn-itad-renewal-repair_548b25ca.jpg",
  impact: "/manus-storage/reborn-itad-human-impact_2194f47e.jpg",
  legacyWordmark: "/manus-storage/reborn-original-wordmark-cropped_4aa8ffb6.png",
};

const continuousFilm = "/manus-storage/reborn-asset-to-impact-film-continuous_1065c67c.mp4";

const journey = [
  {
    number: "01",
    label: "Collect",
    title: "Start with a controlled handover.",
    body: "We scope the job, plan the collection and establish a clear chain of custody from the moment your devices leave site.",
    proof: "Site planning · Secure logistics · Transfer of custody",
  },
  {
    number: "02",
    label: "Secure",
    title: "Make every asset visible.",
    body: "Assets are captured, assessed and processed through a defined data-erasure route—with the records needed to make the result intelligible later.",
    proof: "Asset records · Securaze-powered erasure · Evidence trail",
  },
  {
    number: "03",
    label: "Recover",
    title: "Give viable tech another route.",
    body: "Testing, grading, repair and valuation separate valuable equipment from material that belongs in a responsible recovery stream.",
    proof: "Testing · Repair · Remarketing / buyback",
  },
  {
    number: "04",
    label: "Return",
    title: "Close the loop with purpose.",
    body: "Each asset reaches a suitable outcome: redeployment, approved redistribution, charitable impact or WEEE-compliant material recovery.",
    proof: "Outcome reporting · Impact routes · Responsible recycling",
  },
];

const proofPoints = [
  {
    icon: ShieldCheck,
    eyebrow: "Data assurance",
    title: "Securaze UK partner",
    body: "Bulk GSM is a Securaze UK partner—bringing specialist data-erasure and diagnostic capability into the Reborn ITAD journey.",
  },
  {
    icon: ScanLine,
    eyebrow: "Asset control",
    title: "Trace what matters",
    body: "Asset records, device identifiers and agreed reporting fields form the evidence layer behind each collection and outcome.",
  },
  {
    icon: FileCheck2,
    eyebrow: "Decision evidence",
    title: "Leave with proof",
    body: "From collection detail to data-erasure evidence and final outcome reporting, we make the process easier to account for.",
  },
];

const serviceRoutes = [
  "Secure collection & site planning",
  "Data erasure & asset records",
  "Testing, grading & valuation",
  "Repair, reuse & redistribution",
  "WEEE recycling & final reporting",
];

export default function Home() {
  const [menuOpen, setMenuOpen] = useState(false);

  const showPortalMessage = () => {
    toast("Customer portal — coming soon", {
      description:
        "Role-based access for collection tracking, asset records and evidence is being designed separately.",
    });
  };

  const closeMenu = () => setMenuOpen(false);

  return (
    <div className="site-shell">
      <header className="site-header">
        <a className="brand-lockup" href="#top" aria-label="Reborn Tech home" onClick={closeMenu}>
          <img className="legacy-wordmark" src={ASSETS.legacyWordmark} alt="Reborn Tech" />
        </a>

        <nav className={`site-nav ${menuOpen ? "is-open" : ""}`} aria-label="Primary navigation">
          <a href="#journey" onClick={closeMenu}>The journey</a>
          <a href="#services" onClick={closeMenu}>Services</a>
          <a href="#impact" onClick={closeMenu}>Impact</a>
          <a href="#locations" onClick={closeMenu}>Locations</a>
          <button className="nav-portal" onClick={showPortalMessage}>Customer portal <ArrowUpRight size={14} /></button>
        </nav>

        <div className="header-actions">
          <a className="header-cta" href="#contact">Start an asset journey <ArrowUpRight size={15} /></a>
          <button className="menu-toggle" onClick={() => setMenuOpen((open) => !open)} aria-label="Toggle menu" aria-expanded={menuOpen}>
            {menuOpen ? <X size={23} /> : <Menu size={23} />}
          </button>
        </div>
      </header>

      <main id="top">
        <section className="hero-section" aria-labelledby="hero-title">
          <video
            className="hero-video"
            src={continuousFilm}
            poster={ASSETS.hero}
            autoPlay
            muted
            loop
            playsInline
            preload="auto"
            aria-label="Illustrative Reborn Tech asset-to-impact film: secure collection, processing, renewal, recovery and return"
          />
          <div className="hero-vignette" />
          <div className="hero-trace" aria-hidden="true"><span /></div>
          <div className="hero-panel">
            <p className="asset-label"><span className="label-dot" />ITAD, made accountable</p>
            <h1 id="hero-title">Secure ITAD.<br /><em>Second life, verified.</em></h1>
            <p className="hero-copy">Reborn Tech turns retired IT into secure, traceable outcomes—whether that means recovery, reuse, redistribution or responsible recycling.</p>
            <div className="hero-actions">
              <a className="button button-lime" href="#contact">Start an asset journey <ArrowUpRight size={18} /></a>
              <a className="text-link" href="#journey">Follow the process <ChevronRight size={18} /></a>
            </div>
            <p className="hero-film-status"><span className="film-pulse" />ASSET-TO-IMPACT FILM / CONTINUOUS EDIT</p>
          </div>
          <div className="hero-index" aria-label="Reborn Tech approach">
            <span>01 / 04</span>
            <p>Collect <i /> Secure <i /> Recover <i /> Return</p>
          </div>
        </section>

        <section className="manifesto-section" aria-label="Reborn Tech statement">
          <p className="asset-label dark-label"><span className="label-dot" />THE VALUE NOBODY SEES</p>
          <div className="manifesto-layout">
            <h2>Old IT is not the end of a story. It is a decision point.</h2>
            <div>
              <p>Your hardware may contain data, residual value, usable materials and the potential for a useful second life. We help you deal with all of it—without losing the evidence along the way.</p>
              <a className="text-link dark-link" href="#services">Explore our ITAD routes <ChevronRight size={18} /></a>
            </div>
          </div>
        </section>

        <section id="journey" className="journey-section" aria-labelledby="journey-title">
          <div className="journey-head">
            <div>
              <p className="asset-label light-surface-label"><span className="label-dot" />THE TRACE</p>
              <h2 id="journey-title">Nothing disappears into a black box.</h2>
            </div>
            <p>From the first collection plan to the final asset outcome, the route is designed to be clear, defensible and useful.</p>
          </div>

          <div className="journey-line" aria-hidden="true"><span /></div>
          <div className="journey-list">
            {journey.map((stage, index) => (
              <article className={`journey-stage stage-${index + 1}`} key={stage.number}>
                <div className="stage-marker"><span>{stage.number}</span></div>
                <div className="stage-content">
                  <p className="stage-label">{stage.label}</p>
                  <h3>{stage.title}</h3>
                  <p>{stage.body}</p>
                  <span className="stage-proof"><Check size={15} />{stage.proof}</span>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section id="services" className="process-visual-section" aria-labelledby="processing-title">
          <div className="processing-visual">
            <img src={ASSETS.processing} alt="Technician recording and processing a business laptop" />
            <div className="processing-stamp"><ScanLine size={20} /><span>RECORD<br />THE ROUTE</span></div>
          </div>
          <div className="processing-copy">
            <p className="asset-label dark-label"><span className="label-dot" />SECURE, THEN DECIDE</p>
            <h2 id="processing-title">Data security should lead to a useful decision.</h2>
            <p>Data erasure is not the final chapter. Once an asset has been secured and assessed, we determine the most suitable next step for its condition, value and potential.</p>
            <div className="route-list">
              {serviceRoutes.map((route, index) => <div key={route}><span>0{index + 1}</span>{route}</div>)}
            </div>
            <a className="button button-dark" href="#contact">Discuss your asset estate <ArrowUpRight size={18} /></a>
          </div>
        </section>

        <section className="proof-section" aria-labelledby="proof-title">
          <div className="proof-heading">
            <p className="asset-label"><span className="label-dot" />THE EVIDENCE LAYER</p>
            <h2 id="proof-title">Operationally sound. Evidently clear.</h2>
          </div>
          <div className="proof-grid">
            {proofPoints.map(({ icon: Icon, eyebrow, title, body }) => (
              <article key={title} className="proof-card">
                <Icon className="proof-icon" strokeWidth={1.65} />
                <p>{eyebrow}</p>
                <h3>{title}</h3>
                <span>{body}</span>
                <small>ASSET ROUTE / EVIDENCE READY</small>
              </article>
            ))}
          </div>
        </section>

        <section className="renewal-section" aria-labelledby="renewal-title">
          <div className="renewal-copy">
            <p className="asset-label"><span className="label-dot" />REPAIR IS ONE ROUTE</p>
            <h2 id="renewal-title">Keep what can keep going.</h2>
            <p>Repair and refurbishment belong inside a wider ITAD strategy. Viable equipment is tested carefully and restored with purpose; devices that cannot return to use move into responsible recovery instead.</p>
            <p className="renewal-quote">“The best outcome is not always the same outcome. It is the right one for that asset.”</p>
          </div>
          <div className="renewal-visual"><img src={ASSETS.renewal} alt="Precision repair of a viable business laptop" /></div>
        </section>

        <section id="impact" className="impact-section" aria-labelledby="impact-title">
          <img className="impact-image" src={ASSETS.impact} alt="A refurbished laptop supporting a community learning environment" />
          <div className="impact-overlay" />
          <div className="impact-copy">
            <p className="asset-label impact-label"><span className="label-dot" />THE OUTCOME YOU MAY NEVER SEE</p>
            <h2 id="impact-title">A device can become access.</h2>
            <p>When a usable asset is given the right route, it can return as a tool for learning, work, connection or community. That is why outcome matters as much as disposal.</p>
            <div className="impact-actions">
              <a className="button button-lime" href="#contact">Talk about an impact route <ArrowUpRight size={18} /></a>
              <span><HeartHandshake size={19} />Impact partnerships, including StayWell</span>
            </div>
          </div>
          <p className="impact-caption">Impact routes are agreed, evidenced and reported—never assumed.</p>
        </section>

        <section id="locations" className="locations-section" aria-labelledby="locations-title">
          <div className="locations-head">
            <p className="asset-label dark-label"><span className="label-dot" />TWO OPERATING HUBS</p>
            <h2 id="locations-title">Built for the journey from your site.</h2>
          </div>
          <p className="chapter-cue">ROUTE / 05 — COLLECTION TO OUTCOME</p>
          <div className="location-grid">
            <article>
              <span className="location-number">LON / 01</span>
              <h3>London</h3>
              <p>Bulk GSM operational hub<br />NW10 2XA</p>
              <span>Collection, intake & ITAD operations</span>
            </article>
            <article>
              <span className="location-number">CH / 02</span>
              <h3>Chorley</h3>
              <p>Unit 21, Coppull Mill<br />PR7 5BW</p>
              <span>Processing, repair & recovery operations</span>
            </article>
          </div>
        </section>

        <section className="portal-section" aria-labelledby="portal-title">
          <Route className="portal-route" strokeWidth={1.3} />
          <div>
            <p className="asset-label"><span className="label-dot" />CUSTOMER PORTAL / IN DEVELOPMENT</p>
            <h2 id="portal-title">The next layer is visibility.</h2>
            <p>We are designing separate customer and admin access for collection progress, asset records, evidence and outcome reporting—built around the permissions each team actually needs.</p>
          </div>
          <button className="button button-outline" onClick={showPortalMessage}>Register portal interest <ArrowUpRight size={18} /></button>
        </section>

        <section id="contact" className="contact-section" aria-labelledby="contact-title">
          <div className="contact-line" aria-hidden="true" />
          <p className="asset-label"><span className="label-dot" />START HERE</p>
          <p className="contact-cue">OPEN A NEW ASSET ROUTE / 00</p>
          <h2 id="contact-title">Ready to put your retired IT to work?</h2>
          <p>Send us a rough inventory, site details and collection timing. We will map a route that protects your data and makes the most of what remains.</p>
          <a className="button button-lime contact-button" href="mailto:info@bulkgsm.com?subject=Reborn%20Tech%20ITAD%20enquiry">Start an assessment <ArrowUpRight size={18} /></a>
        </section>
      </main>

      <footer className="site-footer">
        <a className="brand-lockup footer-brand" href="#top" aria-label="Back to top"><img className="legacy-wordmark" src={ASSETS.legacyWordmark} alt="Reborn Tech" /></a>
        <p>Secure ITAD. Second life, verified.</p>
        <div><span>Powered by Bulk GSM capability</span><span>© {new Date().getFullYear()} Reborn Tech</span></div>
      </footer>
    </div>
  );
}
