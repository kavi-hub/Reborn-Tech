export type CoreExceptionStatus = "open" | "in_progress" | "resolved";
export type CoreExceptionFilter = "all" | CoreExceptionStatus;
export type CoreExceptionSort = "updated_desc" | "updated_asc" | "status" | "owner";

export type CoreExceptionListItem = { status: CoreExceptionStatus; ownerName: string; updatedAt: Date };

export function filterAndSortCoreExceptions<T extends CoreExceptionListItem>(rows: readonly T[], filter: CoreExceptionFilter, sort: CoreExceptionSort) {
  return rows.filter((row) => filter === "all" || row.status === filter).toSorted((left, right) => {
    if (sort === "status") return left.status.localeCompare(right.status) || right.updatedAt.getTime() - left.updatedAt.getTime();
    if (sort === "owner") return left.ownerName.localeCompare(right.ownerName) || right.updatedAt.getTime() - left.updatedAt.getTime();
    return sort === "updated_asc" ? left.updatedAt.getTime() - right.updatedAt.getTime() : right.updatedAt.getTime() - left.updatedAt.getTime();
  });
}
