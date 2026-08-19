/** Material Trace evidence pages: focused operational detail that deepens buyer confidence without becoming a generic brochure. */
import { ArrowUpRight, Check, FileCheck2, HeartHandshake, LockKeyhole, Route, ScanLine, ShieldCheck } from "lucide-react";
import { SiteFooter, SiteHeader } from "@/components/PublicChrome";

const assets = {
  processing: "/manus-storage/reborn-itad-secure-processing_e2cbfd90.jpg",
  renewal: "/manus-storage/reborn-itad-renewal-repair_548b25ca.jpg",
  impact: "/manus-storage/reborn-itad-human-impact_2194f47e.jpg",
};

function PageLead({ eyebrow, title, body, route }: { eyebrow: string; title: string; body: string; route: string }) {
  return <section className="page-lead"><div><p className="asset-label"><span className="label-dot" />{eyebrow}</p><p className="page-route">{route}</p><h1>{title}</h1></div><p>{body}</p></section>;
}

function AssessmentBand() {
  return <section className="page-assessment-band"><p className="asset-label"><span className="label-dot" />START WITH THE FACTS</p><div><h2>Tell us what is leaving site. We will map its route.</h2><a className="button button-lime" href="/#contact">Request an ITAD assessment <ArrowUpRight size={18} /></a></div></section>;
}

export function ServicesPage() {
  const routes = [
    ["01", "Plan & collect", "Site scope, collection planning and controlled transfer of custody."],
    ["02", "Record & secure", "Asset capture, diagnostics and an agreed data-erasure route before value decisions are made."],
    ["03", "Test & value", "Condition assessment, grading and valuation to clarify what can be reused, resold or recovered."],
    ["04", "Renew & redistribute", "Repair or refurbishment for viable equipment, with a suitable second-life destination agreed in advance."],
    ["05", "Recover & report", "Responsible material-recovery routes and outcome reporting for assets that cannot return to use."],
  ];
  return <div className="site-shell"><SiteHeader active="Services" /><main className="page-main"><PageLead eyebrow="THE ITAD ROUTE" route="SERVICE MAP / 01" title="One asset estate. More than one responsible outcome." body="Reborn Tech handles the decision points that sit behind IT asset disposition: collection, security, value recovery, reuse and final material recovery." />
    <section className="service-map"><div className="service-map-visual"><img src={assets.processing} alt="IT asset processing and evidence capture" /><span>RECORD THE ROUTE / BEFORE VALUE</span></div><div className="service-map-list">{routes.map(([number, title, body]) => <article key={number}><span>{number}</span><div><h2>{title}</h2><p>{body}</p></div></article>)}</div></section>
    <section className="service-note"><p className="asset-label dark-label"><span className="label-dot" />THE DECISION STANDARD</p><h2>Repair is not the product. <em>The right outcome is.</em></h2><p>We treat repair as one controlled route within a broader ITAD decision. The objective is a safe, traceable next step for every asset—not an assumed result for all of them.</p></section><AssessmentBand /></main><SiteFooter /></div>;
}

export function SecurityPage() {
  const evidence = [
    { icon: ScanLine, title: "Asset identity", body: "Agree the information that matters before collection: asset categories, identifiers, site constraints and reporting needs." },
    { icon: LockKeyhole, title: "Secure processing", body: "Build data erasure into the decision path rather than treating it as an afterthought. Reborn brings Securaze UK partner capability into this route." },
    { icon: FileCheck2, title: "Evidence trail", body: "Keep the collection, processing and outcome information together so the final decision can be understood and accounted for." },
  ];
  return <div className="site-shell"><SiteHeader active="Security" /><main className="page-main"><PageLead eyebrow="CONTROL THE HANDOVER" route="SECURITY & EVIDENCE / 02" title="The value of old IT should never come at the expense of control." body="Security is a route, not a statement. Reborn starts by making an asset estate visible, agrees the evidence required, and carries that record through the next decision." />
    <section className="security-evidence">{evidence.map(({ icon: EvidenceIcon, title, body }, index) => <article key={title}><div className="evidence-number">0{index + 1}</div><EvidenceIcon /><h2>{title}</h2><p>{body}</p></article>)}</section>
    <section className="securaze-feature"><div><p className="asset-label"><span className="label-dot" />SECURAZE UK PARTNER CAPABILITY</p><h2>Data erasure that supports a second-life decision.</h2><p>Securaze describes its technology as diagnostics, management and certified data-erasure software for electronic assets. Reborn uses the partnership as a specialist capability within the ITAD process; the exact erasure standard and evidence are agreed for each engagement.</p><a className="text-link" href="https://securaze.com/about/" target="_blank" rel="noreferrer">Explore Securaze technology <ArrowUpRight size={17} /></a></div><img src={assets.renewal} alt="Controlled technical assessment of a viable IT asset" /></section>
    <section className="security-caveat"><ShieldCheck size={30} /><div><h2>Proof before promises.</h2><p>We will only publish specific certifications, licences, completion standards and partner badges after their current scope has been verified. That protects your procurement process as much as ours.</p></div></section><AssessmentBand /></main><SiteFooter /></div>;
}

export function ImpactPage() {
  return <div className="site-shell"><SiteHeader active="Impact" /><main className="page-main"><PageLead eyebrow="THE RETURN" route="IMPACT & PARTNERS / 03" title="Second life should be visible in the outcome—not lost in the claim." body="Reborn’s impact story is rooted in a controlled asset journey. Where an impact route is appropriate, it is agreed, evidenced and reported rather than assumed." />
    <section className="impact-partner-feature"><img src={assets.impact} alt="A refurbished laptop in a community learning setting" /><div><p className="asset-label"><span className="label-dot" />RECYCLE TO STAY WELL</p><h2>Technology can create value beyond the balance sheet.</h2><p>StayWell’s public “Recycle to Stay Well” initiative describes redundant IT equipment as a source of measurable wellbeing value. Reborn can help customers consider an agreed impact route alongside secure reuse and responsible recovery.</p><div className="impact-link-row"><HeartHandshake size={22} /><a className="text-link" href="https://www.itsmental.co.uk/" target="_blank" rel="noreferrer">Learn about StayWell <ArrowUpRight size={17} /></a></div></div></section>
    <section className="impact-principles"><article><Route /><h2>Agree the destination</h2><p>An impact route should be planned around what the asset can responsibly support—not added after the fact.</p></article><article><Check /><h2>Protect the evidence</h2><p>Collection, security and condition information stay part of the story, wherever a reusable asset goes next.</p></article><article><FileCheck2 /><h2>Report the outcome</h2><p>We are building the reporting layer so customers can distinguish reuse, recovery and agreed impact routes.</p></article></section>
    <section className="case-study-callout"><p className="asset-label"><span className="label-dot" />CASE WORK / IN DEVELOPMENT</p><h2>Real outcomes deserve real evidence.</h2><p>We will publish case work only when the customer, scope, asset figures, outcome and attribution have been approved. Until then, we will not manufacture a success story.</p></section><AssessmentBand /></main><SiteFooter /></div>;
}

export function PrivacyPage() {
  return <div className="site-shell"><SiteHeader /><main className="page-main privacy-main"><PageLead eyebrow="PRIVACY INFORMATION" route="ASSESSMENT ENQUIRIES / 04" title="Clear about the data you give us." body="This information explains how Reborn Tech uses the personal information submitted through the ITAD assessment form. It is written for the current enquiry process and will be reviewed against the final legal and operational arrangements." />
    <section className="privacy-grid"><article><h2>What we collect</h2><p>Name, work contact details, organisation, collection location, asset scope, timing, data-security requirements and any optional notes you choose to send.</p></article><article><h2>Why we use it</h2><p>To assess the request, plan a suitable ITAD route, communicate with you about that request and maintain an operational record of the enquiry.</p></article><article><h2>How you control it</h2><p>You can withdraw your contact permission or ask about your data by emailing <a href="mailto:info@bulkgsm.com">info@bulkgsm.com</a>. We will not use your assessment details for unrelated marketing without asking.</p></article><article><h2>Retention & access</h2><p>We retain enquiry information only for as long as needed to handle the assessment, maintain an appropriate operational record, or meet applicable legal obligations. Access is limited to the Reborn operations team and authorised technology providers supporting the service.</p></article></section>
    <section className="privacy-review"><p className="asset-label"><span className="label-dot" />LEGAL REVIEW REQUIRED</p><h2>Before formal launch, we will confirm the legal controller, retention schedule, processor list, international-transfer position and the appropriate lawful basis for each use of your data.</h2><p>This page is transparent about the current process, but is not a substitute for the final legal privacy notice. Please contact us if you have a request before that review is complete.</p></section></main><SiteFooter /></div>;
}
