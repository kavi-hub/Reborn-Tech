export const operationsNavigation = [
  { id: "assessment-enquiries", label: "Assessment enquiries", path: "/operations" },
  { id: "collection-tracking", label: "Collection tracking", path: "/operations/collections" },
  { id: "bulk-itad-dash", label: "Bulk GSM ITAD Dash", path: "/bulk/itad-dash" },
] as const;

export function hasUniqueOperationsNavigation() {
  const ids = new Set(operationsNavigation.map((item) => item.id));
  const paths = new Set(operationsNavigation.map((item) => item.path));
  return ids.size === operationsNavigation.length && paths.size === operationsNavigation.length;
}
