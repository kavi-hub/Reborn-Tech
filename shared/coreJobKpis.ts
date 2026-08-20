import { getCoreExceptionSlaState, type CoreExceptionStatus } from "./coreJobExceptions";

export type CoreJobKpiException = { id: number; title: string; status: CoreExceptionStatus; createdAt: Date; dueAt?: Date | null };

export function calculateCoreJobExceptionKpis(rows: readonly CoreJobKpiException[], now = new Date()) {
  const unresolved = rows.filter((row) => row.status !== "resolved");
  const ageHours = (row: CoreJobKpiException) => Math.max(0, Math.floor((now.getTime() - row.createdAt.getTime()) / 3_600_000));
  const oldest = unresolved.toSorted((left, right) => left.createdAt.getTime() - right.createdAt.getTime())[0];
  return {
    unresolvedCount: unresolved.length,
    ageingOver24Hours: unresolved.filter((row) => ageHours(row) >= 24).length,
    ageingOver72Hours: unresolved.filter((row) => ageHours(row) >= 72).length,
    overdueCount: unresolved.filter((row) => getCoreExceptionSlaState(row, now) === "overdue").length,
    dueSoonCount: unresolved.filter((row) => getCoreExceptionSlaState(row, now) === "due_soon").length,
    oldestUnresolved: oldest ? { id: oldest.id, title: oldest.title, createdAt: oldest.createdAt, ageHours: ageHours(oldest) } : null,
  };
}
