/** Material Trace evidence pages: focused operational detail that deepens buyer confidence without becoming a generic brochure. */
import { ArrowUpRight, Check, Download, FileCheck2, HeartHandshake, LockKeyhole, Route, ScanLine, ShieldCheck } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
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

const faqs = [
  ["What should we prepare before an ITAD assessment?", "A rough asset inventory is useful, but it is not essential. Start with the sites involved, the likely asset categories and quantity, collection timing, access constraints, any data-security requirements, and the outcome you are trying to achieve."],
  ["Can Reborn support collections from more than one location?", "Yes. Include each site in the assessment and we will scope collection and handover requirements around the estate, rather than forcing every location into the same route."],
  ["How is reuse distinguished from recycling?", "Assets are secured, assessed and tested before a next step is agreed. Viable equipment may be suitable for repair, refurbishment, reuse or resale. Equipment that cannot return to use moves into a responsible material-recovery route."],
  ["How should we approach data erasure?", "Tell us what evidence or operating requirement applies to your organisation. Reborn can incorporate a defined erasure route and appropriate records into the assessment, using its Securaze UK partner capability where suitable."],
  ["Can social impact form part of the route?", "Yes, where an asset is suitable and the destination is agreed in advance. Impact is treated as a documented outcome alongside security, reuse and recovery—not as an assumed claim."],
  ["Is there customer visibility after collection?", "The first release of the customer portal is being designed around collection progress, asset records, evidence and outcome reporting. Register your interest through the assessment form so we can scope the visibility you need."],
];

function ItadFaq() {
  return <section className="faq-section" aria-labelledby="faq-title"><div className="faq-heading"><p className="asset-label dark-label"><span className="label-dot" />PRACTICAL QUESTIONS / CLEAR ROUTES</p><h2 id="faq-title">The first questions are usually the important ones.</h2><p>Use the assessment form if your situation is specific. We will help establish the facts before proposing a route.</p></div><Accordion type="single" collapsible className="faq-list">{faqs.map(([question, answer], index) => <AccordionItem key={question} value={`faq-${index}`} className="faq-item"><AccordionTrigger className="faq-trigger"><span>0{index + 1}</span>{question}</AccordionTrigger><AccordionContent className="faq-content"><p>{answer}</p></AccordionContent></AccordionItem>)}</Accordion></section>;
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
    <section className="service-note"><p className="asset-label dark-label"><span className="label-dot" />THE DECISION STANDARD</p><h2>Repair is not the product. <em>The right outcome is.</em></h2><p>We treat repair as one controlled route within a broader ITAD decision. The objective is a safe, traceable next step for every asset—not an assumed result for all of them.</p></section><ItadFaq /><AssessmentBand /></main><SiteFooter /></div>;
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
    <section className="case-study-callout"><p className="asset-label"><span className="label-dot" />CASE NARRATIVE / INDICATIVE DRAFT</p><h2>One carefully handled laptop can become a beginning.</h2><div className="case-narrative-flow"><article><span>THE MOMENT</span><p>A laptop leaves an office as a retired asset: data to protect, value to assess and no obvious next chapter.</p></article><article><span>THE DECISION</span><p>Once a secure route and condition assessment are complete, a viable device can move beyond storage, scrap or uncertainty.</p></article><article><span>THE RETURN</span><p>In the right hands, a second-life device can become a desk, a lesson, a first application or a moment of connection.</p></article></div><p className="case-narrative-note">Prepared with Brian Hurting as a creative starting point. This is an illustrative route narrative—not customer testimony, a quantified result or an approved case study. It will be replaced with verified customer evidence when the underlying facts are approved.</p></section><AssessmentBand /></main><SiteFooter /></div>;
}

export function PrivacyPage() {
  return <div className="site-shell"><SiteHeader /><main className="page-main privacy-main"><PageLead eyebrow="PRIVACY INFORMATION" route="ASSESSMENT ENQUIRIES / 04" title="Clear about the data you give us." body="This information explains the current assessment-enquiry process operated by Bulk GSM T/a Reborn. It is designed to make an ITAD conversation possible without retaining enquiry data indefinitely." />
    <section className="privacy-grid"><article><h2>Who manages the enquiry</h2><p>The current controller for this website’s assessment-enquiry process is <strong>Bulk GSM T/a Reborn</strong>. Use <a href="mailto:info@bulkgsm.com">info@bulkgsm.com</a> for a question about information you have submitted.</p></article><article><h2>What we collect</h2><p>Name, work contact details, organisation, collection location, asset scope, timing, data-security requirements and any optional notes you choose to send.</p></article><article><h2>Why we use it</h2><p>To assess the request, plan a suitable ITAD route, communicate with you about that request and maintain an operational record of the enquiry.</p></article><article><h2>Retention, review & access</h2><p>Assessment enquiries are marked for review no later than 24 months after submission. If an enquiry becomes a live customer relationship or record we need to keep, it moves to the relevant customer or financial-record schedule instead. Access is limited to the Reborn operations team and authorised technology providers supporting the service.</p></article></section>
    <section className="privacy-review"><p className="asset-label"><span className="label-dot" />CURRENT OPERATING POSITION</p><h2>Reborn Tech Ltd is the intended future operating company. Until that transition is active, Bulk GSM T/a Reborn remains the controller for this enquiry flow.</h2><p>We will update this notice before responsibility for submitted personal data moves to the new company. You can ask about, correct or request deletion of your assessment information by emailing <a href="mailto:info@bulkgsm.com">info@bulkgsm.com</a>.</p><div className="privacy-actions"><a className="button button-lime" href="/manus-storage/reborn-privacy-information_2e500792.pdf" download>Download Privacy Information PDF <Download size={17} /></a><span>Current assessment-enquiry position / PDF</span></div></section></main><SiteFooter /></div>;
}
