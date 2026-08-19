// Reborn Privacy Information PDF — the report theme owns document geometry and typography.
#import "report-theme.typ": report-accent, report-theme

#show: report-theme.with(
  title: "Privacy Information",
  author: "Bulk GSM T/a Reborn",
  rhythm: "report",
  running-header: true,
)

// ---------- Title page ----------
#page(margin: (top: 30%, x: 2.2cm), numbering: none, header: none)[
  #set par(first-line-indent: 0em)
  #align(center)[
    #text(size: 26pt, weight: "bold", fill: report-accent)[Privacy Information]
    #v(0.5em)
    #text(size: 14pt, fill: luma(80))[ITAD Assessment Enquiries]
    #v(2em)
    #line(length: 40%, stroke: 0.5pt + luma(160))
    #v(2em)
    #text(size: 12pt)[
      Current controller: Bulk GSM T/a Reborn \
      Published: #datetime.today().display("[day] [month repr:long] [year]")
    ]
  ]
]

// ---------- Table of contents ----------
#page(numbering: none, header: none)[
  #outline(title: [Contents], indent: 1.5em)
]

// ---------- Main body ----------
#counter(page).update(1)

= Purpose of this document

This document explains how *Bulk GSM T/a Reborn* handles personal information submitted through the Reborn Tech ITAD assessment form. It applies to the current enquiry process: the point at which an organisation asks Reborn to assess retired technology, collection requirements and potential next steps.

The aim is simple: collect only the information needed to understand the request, keep it available for an appropriate operational period, and avoid holding enquiry data indefinitely.

= Who manages the enquiry

The current controller for the assessment-enquiry process is *Bulk GSM T/a Reborn*. Questions about information submitted through the website can be sent to #link("mailto:info%40bulkgsm.com")[#text("info@bulkgsm.com")].

Reborn Tech Ltd is the intended future operating company. Before responsibility for submitted personal information moves to that company, this document and the public website notice will be updated to reflect the new arrangement.

= Information we collect

The assessment form may collect the following information:

- Your name, work email address and telephone number.
- Your organisation and collection location.
- Asset categories, approximate quantity, collection timing and asset-inventory availability.
- Data-security requirements, including whether on-site erasure may be needed.
- Operational notes that you choose to provide.

= Why we use it

We use assessment-enquiry information to understand the scope of a potential ITAD project, plan a suitable collection and processing route, communicate with the requester about that route, and maintain an appropriate operational record of the enquiry.

We do not use assessment details for unrelated marketing without a separate reason to do so.

= Retention and review

Each website assessment enquiry is marked for review no later than *24 months* after it is submitted. At that point, the enquiry should be deleted or anonymised unless there is a clear ongoing reason to retain it.

If an assessment progresses into a live customer relationship, service delivery, financial record or another active operational matter, the relevant information moves to the applicable customer or business-record schedule instead. This does not mean that every enquiry is retained for that period; the record should be reviewed earlier if it is no longer required.

= Access and requests

Access to assessment records is limited to the Reborn operations team and authorised technology providers that support the service. You can ask about, correct, withdraw contact permission for, or request deletion of information you submitted by emailing #link("mailto:info%40bulkgsm.com")[#text("info@bulkgsm.com")].

= Contact

For questions about this document or your assessment enquiry, contact:

#block(inset: 12pt, fill: luma(245), radius: 0pt)[
  *Bulk GSM T/a Reborn* \
  #link("mailto:info%40bulkgsm.com")[#text("info@bulkgsm.com")] \
  Reborn Tech — Secure ITAD. Second life, verified.
]
