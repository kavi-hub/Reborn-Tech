import { describe, expect, it } from "vitest";
import { calculateCoreJobExceptionKpis } from "../shared/coreJobKpis";

describe("Core Job exception KPIs", () => {
  const now = new Date("2026-08-20T12:00:00Z");

  it("excludes resolved records and calculates 24-hour and 72-hour ageing thresholds", () => {
    const kpis = calculateCoreJobExceptionKpis([
      { id: 1, title: "Fresh", status: "open", createdAt: new Date("2026-08-20T11:00:00Z"), dueAt: new Date("2026-08-21T11:00:00Z") },
      { id: 2, title: "One day", status: "in_progress", createdAt: new Date("2026-08-19T12:00:00Z"), dueAt: new Date("2026-08-19T12:00:00Z") },
      { id: 3, title: "Three days", status: "open", createdAt: new Date("2026-08-17T12:00:00Z"), dueAt: null },
      { id: 4, title: "Resolved legacy", status: "resolved", createdAt: new Date("2026-08-10T12:00:00Z"), dueAt: new Date("2026-08-10T12:00:00Z") },
    ], now);

    expect(kpis).toMatchObject({ unresolvedCount: 3, ageingOver24Hours: 2, ageingOver72Hours: 1, overdueCount: 1, dueSoonCount: 1, oldestUnresolved: { id: 3, ageHours: 72 } });
  });

  it("returns a clear oldest-item state when every exception is resolved", () => {
    expect(calculateCoreJobExceptionKpis([{ id: 1, title: "Done", status: "resolved", createdAt: new Date("2026-08-01T12:00:00Z"), dueAt: new Date("2026-08-01T12:00:00Z") }], now)).toEqual({ unresolvedCount: 0, ageingOver24Hours: 0, ageingOver72Hours: 0, overdueCount: 0, dueSoonCount: 0, oldestUnresolved: null });
  });
});
