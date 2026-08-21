import { describe, expect, it } from "vitest";
import { getClientJobLifecycleProgress } from "../shared/itadLifecycle";

describe("client lifecycle progress", () => {
  it("maps each Core stage to a deterministic progress value", () => {
    expect(getClientJobLifecycleProgress("intake")).toEqual({ activeIndex: 0, percent: 13 });
    expect(getClientJobLifecycleProgress("evidence_review")).toEqual({ activeIndex: 5, percent: 75 });
    expect(getClientJobLifecycleProgress("completed")).toEqual({ activeIndex: 7, percent: 100 });
  });

  it("fails safely to the first stage for an unknown state", () => {
    expect(getClientJobLifecycleProgress("unexpected")).toEqual({ activeIndex: 0, percent: 13 });
  });
});
