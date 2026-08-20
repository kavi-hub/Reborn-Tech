import { describe, expect, it } from "vitest";
import { filterAndSortCoreExceptions, getCoreExceptionSlaState } from "../shared/coreJobExceptions";

const rows = [
  { id: 1, status: "resolved" as const, ownerName: "Zoe", updatedAt: new Date("2026-08-18T09:00:00Z"), createdAt: new Date("2026-08-10T09:00:00Z"), dueAt: new Date("2026-08-15T09:00:00Z") },
  { id: 2, status: "open" as const, ownerName: "Andi", updatedAt: new Date("2026-08-20T09:00:00Z"), createdAt: new Date("2026-08-18T09:00:00Z"), dueAt: new Date("2026-08-21T10:00:00Z") },
  { id: 3, status: "in_progress" as const, ownerName: "Kavi", updatedAt: new Date("2026-08-19T09:00:00Z"), createdAt: new Date("2026-08-16T09:00:00Z"), dueAt: new Date("2026-08-19T10:00:00Z") },
  { id: 4, status: "open" as const, ownerName: "Andi", updatedAt: new Date("2026-08-18T08:00:00Z"), createdAt: new Date("2026-08-19T08:00:00Z"), dueAt: null },
];

describe("Core Job exception review controls", () => {
  it("filters by status without mutating the source ledger", () => {
    const open = filterAndSortCoreExceptions(rows, "open", "updated_desc");
    expect(open.map((row) => row.id)).toEqual([2, 4]);
    expect(rows.map((row) => row.id)).toEqual([1, 2, 3, 4]);
  });

  it("sorts deterministically by activity, status and owner", () => {
    expect(filterAndSortCoreExceptions(rows, "all", "updated_asc").map((row) => row.id)).toEqual([4, 1, 3, 2]);
    expect(filterAndSortCoreExceptions(rows, "all", "status").map((row) => row.id)).toEqual([3, 2, 4, 1]);
    expect(filterAndSortCoreExceptions(rows, "all", "owner").map((row) => row.id)).toEqual([2, 4, 3, 1]);
  });

  it("derives SLA state and applies every KPI-driven filter deterministically", () => {
    const now = new Date("2026-08-20T12:00:00Z");
    expect(getCoreExceptionSlaState(rows[2], now)).toBe("overdue");
    expect(getCoreExceptionSlaState(rows[1], now)).toBe("due_soon");
    expect(getCoreExceptionSlaState(rows[3], now)).toBe("unscheduled");
    expect(filterAndSortCoreExceptions(rows, "unresolved", "updated_desc", now).map((row) => row.id)).toEqual([2, 3, 4]);
    expect(filterAndSortCoreExceptions(rows, "ageing_24", "updated_desc", now).map((row) => row.id)).toEqual([2, 3, 4]);
    expect(filterAndSortCoreExceptions(rows, "ageing_72", "updated_desc", now).map((row) => row.id)).toEqual([3]);
    expect(filterAndSortCoreExceptions(rows, "overdue", "updated_desc", now).map((row) => row.id)).toEqual([3]);
    expect(filterAndSortCoreExceptions(rows, "due_soon", "updated_desc", now).map((row) => row.id)).toEqual([2]);
    expect(filterAndSortCoreExceptions(rows, "oldest", "updated_desc", now).map((row) => row.id)).toEqual([3]);
  });
});
