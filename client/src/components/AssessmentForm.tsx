/** Material Trace form: structured intake for a secure ITAD assessment, deliberately concise but operationally useful. */
import { useState } from "react";
import { CheckCircle2, LoaderCircle } from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";

type AssessmentFormValues = {
  fullName: string;
  email: string;
  phone?: string;
  organisation: string;
  jobTitle?: string;
  sitePostcode?: string;
  assetCategories: string[];
  approximateAssetCount?: string;
  collectionTimeline?: string;
  dataSecurityRequirement?: string;
  hasInventory: boolean;
  requiresOnSiteErasure: boolean;
  notes?: string;
  contactConsent: boolean;
};

const categories = ["Laptops & desktops", "Mobile devices", "Servers & storage", "Network equipment", "Monitors & peripherals"];

export function AssessmentForm() {
  const [submitted, setSubmitted] = useState(false);
  const { register, handleSubmit, formState: { errors } } = useForm<AssessmentFormValues>({
    defaultValues: {
      assetCategories: [],
      hasInventory: false,
      requiresOnSiteErasure: false,
      contactConsent: false,
    },
  });

  const submitAssessment = trpc.assessment.submit.useMutation({
    onSuccess: () => {
      setSubmitted(true);
      toast("Assessment received", { description: "A Reborn Tech team member will review the request and be in touch." });
    },
    onError: (error) => {
      toast("We could not send your request", { description: error.message || "Please try again shortly." });
    },
  });

  const onSubmit = (values: AssessmentFormValues) => {
    if (!values.contactConsent) return;
    submitAssessment.mutate({ ...values, contactConsent: true });
  };

  if (submitted) {
    return (
      <div className="assessment-success" role="status">
        <CheckCircle2 size={33} />
        <div>
          <p className="assessment-kicker">REQUEST RECEIVED / ROUTE OPEN</p>
          <h3>Your assessment is in motion.</h3>
          <span>We will review your asset scope and contact you about the most suitable next step.</span>
        </div>
      </div>
    );
  }

  return (
    <form className="assessment-form" onSubmit={handleSubmit(onSubmit)} noValidate>
      <div className="assessment-form-head">
        <p>ASSESSMENT INTAKE / 5 MINUTES</p>
        <span>Fields marked <b>*</b> help us scope your collection properly.</span>
      </div>

      <div className="assessment-grid">
        <label className="assessment-field"><span>Your name <b>*</b></span><input {...register("fullName", { required: "Enter your name" })} autoComplete="name" placeholder="Full name" />{errors.fullName && <small>{errors.fullName.message}</small>}</label>
        <label className="assessment-field"><span>Work email <b>*</b></span><input {...register("email", { required: "Enter your work email" })} autoComplete="email" type="email" placeholder="you@company.com" />{errors.email && <small>{errors.email.message}</small>}</label>
        <label className="assessment-field"><span>Organisation <b>*</b></span><input {...register("organisation", { required: "Enter your organisation" })} autoComplete="organization" placeholder="Company name" />{errors.organisation && <small>{errors.organisation.message}</small>}</label>
        <label className="assessment-field"><span>Phone</span><input {...register("phone")} autoComplete="tel" type="tel" placeholder="Best contact number" /></label>
        <label className="assessment-field"><span>Collection postcode</span><input {...register("sitePostcode")} autoComplete="postal-code" placeholder="Primary site postcode" /></label>
        <label className="assessment-field"><span>Likely collection window</span><select {...register("collectionTimeline")}><option value="">Select timing</option><option value="Within 2 weeks">Within 2 weeks</option><option value="This quarter">This quarter</option><option value="Future planning">Future planning</option><option value="Not yet decided">Not yet decided</option></select></label>
      </div>

      <fieldset className="assessment-categories"><legend>What needs a route? <b>*</b></legend><div>{categories.map((category) => <label key={category}><input type="checkbox" value={category} {...register("assetCategories", { required: "Select at least one asset category" })} /><span>{category}</span></label>)}</div>{errors.assetCategories && <small>{errors.assetCategories.message}</small>}</fieldset>

      <div className="assessment-grid assessment-grid-detail">
        <label className="assessment-field"><span>Approximate quantity</span><select {...register("approximateAssetCount")}><option value="">Choose a range</option><option value="1–25 assets">1–25 assets</option><option value="26–100 assets">26–100 assets</option><option value="101–500 assets">101–500 assets</option><option value="500+ assets">500+ assets</option></select></label>
        <label className="assessment-field"><span>Data-security requirement</span><select {...register("dataSecurityRequirement")}><option value="">Not yet specified</option><option value="Standard data erasure evidence">Standard data-erasure evidence</option><option value="On-site erasure needed">On-site erasure needed</option><option value="Specific compliance requirement">Specific compliance requirement</option></select></label>
      </div>

      <div className="assessment-options">
        <label><input type="checkbox" {...register("hasInventory")} /><span>We have an inventory or asset list available.</span></label>
        <label><input type="checkbox" {...register("requiresOnSiteErasure")} /><span>We may require on-site data erasure.</span></label>
      </div>
      <label className="assessment-field assessment-notes"><span>Anything else we should know?</span><textarea {...register("notes")} placeholder="Access constraints, equipment detail, reporting needs or a preferred collection date." rows={4} /></label>
      <label className="assessment-consent"><input type="checkbox" {...register("contactConsent", { required: "Please confirm that we may contact you" })} /><span>I agree that Reborn Tech may contact me about this ITAD assessment. <b>*</b></span></label>
      {errors.contactConsent && <p className="assessment-error">{errors.contactConsent.message}</p>}
      <div className="assessment-submit-row"><p>Your request is stored securely for our operations team and becomes the first record in your asset journey.</p><button className="button button-lime assessment-submit" type="submit" disabled={submitAssessment.isPending}>{submitAssessment.isPending ? <><LoaderCircle className="assessment-spin" size={17} />Sending request</> : "Request an ITAD assessment"}</button></div>
    </form>
  );
}
