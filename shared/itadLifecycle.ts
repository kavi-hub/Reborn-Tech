export const clientJobStages = ["intake", "planned_collection", "received", "processing", "exceptions", "evidence_review", "client_published", "completed"] as const;
export type ClientJobStage = (typeof clientJobStages)[number];

export const clientJobStageLabels: Record<ClientJobStage, string> = {
  intake: "Intake",
  planned_collection: "Collection planned",
  received: "Received",
  processing: "Processing",
  exceptions: "Exception review",
  evidence_review: "Evidence review",
  client_published: "Documents issued",
  completed: "Complete",
};

export function getClientJobLifecycleProgress(stage: string) {
  const activeIndex = clientJobStages.indexOf(stage as ClientJobStage);
  const normalizedIndex = activeIndex < 0 ? 0 : activeIndex;
  return { activeIndex: normalizedIndex, percent: Math.round(((normalizedIndex + 1) / clientJobStages.length) * 100) };
}
