export type CoreExceptionStatus = "open" | "in_progress" | "resolved";
export type CoreExceptionSlaState = "unscheduled" | "on_track" | "due_soon" | "overdue" | "resolved";
export type CoreExceptionFilter = "all" | CoreExceptionStatus | "unresolved" | "ageing_24" | "ageing_72" | "overdue" | "due_soon" | "oldest";
export type CoreExceptionSort = "updated_desc" | "updated_asc" | "status" | "owner";
export type CoreExceptionListItem = { id: number; status: CoreExceptionStatus; ownerName: string; updatedAt: Date; createdAt: Date; dueAt?: Date | null };

export function getCoreExceptionSlaState(row: Pick<CoreExceptionListItem, "status" | "dueAt">, now = new Date()): CoreExceptionSlaState {
  if (row.status === "resolved") return "resolved";
  if (!row.dueAt) return "unscheduled";
  const remainingMs = row.dueAt.getTime() - now.getTime();
  if (remainingMs < 0) return "overdue";
  if (remainingMs <= 86_400_000) return "due_soon";
  return "on_track";
}

export function filterAndSortCoreExceptions<T extends CoreExceptionListItem>(rows: readonly T[], filter: CoreExceptionFilter, sort: CoreExceptionSort, now = new Date()) {
  const oldestId = rows.filter((row) => row.status !== "resolved").toSorted((left, right) => left.createdAt.getTime() - right.createdAt.getTime())[0]?.id;
  const matches = (row: T) => {
    if (filter === "all") return true;
    if (filter === "unresolved") return row.status !== "resolved";
    if (filter === "ageing_24") return row.status !== "resolved" && now.getTime() - row.createdAt.getTime() >= 86_400_000;
    if (filter === "ageing_72") return row.status !== "resolved" && now.getTime() - row.createdAt.getTime() >= 259_200_000;
    if (filter === "oldest") return row.id === oldestId;
    if (filter === "overdue" || filter === "due_soon") return getCoreExceptionSlaState(row, now) === filter;
    return row.status === filter;
  };
  return rows.filter(matches).toSorted((left, right) => {
    if (sort === "status") return left.status.localeCompare(right.status) || right.updatedAt.getTime() - left.updatedAt.getTime();
    if (sort === "owner") return left.ownerName.localeCompare(right.ownerName) || right.updatedAt.getTime() - left.updatedAt.getTime();
    return sort === "updated_asc" ? left.updatedAt.getTime() - right.updatedAt.getTime() : right.updatedAt.getTime() - left.updatedAt.getTime();
  });
}
