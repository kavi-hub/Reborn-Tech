import { describe, expect, it } from "vitest";
import { filterAndSortCoreExceptions } from "../shared/coreJobExceptions";

const rows = [
  { id: 1, status: "resolved" as const, ownerName: "Zoe", updatedAt: new Date("2026-08-18T09:00:00Z") },
  { id: 2, status: "open" as const, ownerName: "Andi", updatedAt: new Date("2026-08-20T09:00:00Z") },
  { id: 3, status: "in_progress" as const, ownerName: "Kavi", updatedAt: new Date("2026-08-19T09:00:00Z") },
  { id: 4, status: "open" as const, ownerName: "Andi", updatedAt: new Date("2026-08-18T08:00:00Z") },
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
});
