export type CoreJobKpiException = { id: number; title: string; status: "open" | "in_progress" | "resolved"; createdAt: Date };

export function calculateCoreJobExceptionKpis(rows: readonly CoreJobKpiException[], now = new Date()) {
  const unresolved = rows.filter((row) => row.status !== "resolved");
  const ageHours = (row: CoreJobKpiException) => Math.max(0, Math.floor((now.getTime() - row.createdAt.getTime()) / 3_600_000));
  const oldest = unresolved.toSorted((left, right) => left.createdAt.getTime() - right.createdAt.getTime())[0];
  return {
    unresolvedCount: unresolved.length,
    ageingOver24Hours: unresolved.filter((row) => ageHours(row) >= 24).length,
    ageingOver72Hours: unresolved.filter((row) => ageHours(row) >= 72).length,
    oldestUnresolved: oldest ? { id: oldest.id, title: oldest.title, createdAt: oldest.createdAt, ageHours: ageHours(oldest) } : null,
  };
}
