export function toggleCurrentArchivePageSelection(currentIds: number[], visiblePageIds: number[], limit = 10) {
  const current = new Set(currentIds);
  if (!visiblePageIds.length) return { selectedIds: currentIds, capped: false };
  if (visiblePageIds.every((jobId) => current.has(jobId))) {
    visiblePageIds.forEach((jobId) => current.delete(jobId));
    return { selectedIds: Array.from(current), capped: false };
  }
  const additions = visiblePageIds.filter((jobId) => !current.has(jobId));
  if (current.size + additions.length > limit) return { selectedIds: currentIds, capped: true };
  additions.forEach((jobId) => current.add(jobId));
  return { selectedIds: Array.from(current), capped: false };
}
