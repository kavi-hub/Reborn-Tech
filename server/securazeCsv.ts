/**
 * Review-safe Securaze CSV mapper. It preserves the supplier's raw result text but
 * never interprets it as a verified erasure conclusion; an operator must review
 * evidence separately before customer visibility is approved.
 */
export type SecurazeMappedAsset = {
  assetCategory: string;
  manufacturer?: string;
  model?: string;
  assetTag?: string;
  serialNumber: string;
  quantity: number;
  sourceRowNumber: number;
  sourceResult: string;
  dataHandlingState: "evidence_pending";
};

export type SecurazeImportException = { rowNumber: number; code: "missing_serial" | "missing_result" | "duplicate_serial"; message: string };

export type SecurazeMappingResult = {
  mappingVersion: "securaze_csv_v1";
  fieldMapping: Record<string, string | null>;
  sourceHeaders: string[];
  validRows: SecurazeMappedAsset[];
  exceptions: SecurazeImportException[];
};

const fieldAliases: Record<keyof Omit<SecurazeMappedAsset, "quantity" | "sourceRowNumber" | "dataHandlingState">, string[]> = {
  assetCategory: ["asset category", "asset type", "device type", "device category", "product type", "category"],
  manufacturer: ["manufacturer", "make", "brand"],
  model: ["model", "device model", "product model"],
  assetTag: ["asset tag", "asset id", "asset identifier", "tag"],
  serialNumber: ["serial number", "serial", "serial no", "serial no."],
  sourceResult: ["result", "status", "erasure result", "process result", "outcome"],
};

function normaliseHeader(value: string) {
  return value.trim().toLowerCase().replace(/[._-]+/g, " ").replace(/\s+/g, " ");
}

function parseCsvRows(source: string) {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentValue = "";
  let quoted = false;
  for (let index = 0; index < source.length; index += 1) {
    const char = source[index];
    if (char === '"') {
      if (quoted && source[index + 1] === '"') { currentValue += '"'; index += 1; } else quoted = !quoted;
      continue;
    }
    if (char === "," && !quoted) { currentRow.push(currentValue); currentValue = ""; continue; }
    if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && source[index + 1] === "\n") index += 1;
      currentRow.push(currentValue);
      if (currentRow.some((value) => value.trim())) rows.push(currentRow);
      currentRow = []; currentValue = ""; continue;
    }
    currentValue += char;
  }
  currentRow.push(currentValue);
  if (currentRow.some((value) => value.trim())) rows.push(currentRow);
  if (quoted) throw new Error("The CSV contains an unclosed quoted value");
  return rows;
}

export function mapSecurazeCsv(source: string): SecurazeMappingResult {
  const rows = parseCsvRows(source.replace(/^\uFEFF/, ""));
  if (rows.length < 2) throw new Error("The Securaze CSV needs a header row and at least one data row");
  if (rows.length > 5_001) throw new Error("The Securaze CSV exceeds the 5,000-row review limit");
  const sourceHeaders = rows[0].map((header) => header.trim());
  const headerLookup = new Map(sourceHeaders.map((header, index) => [normaliseHeader(header), index]));
  const fieldMapping = Object.fromEntries(Object.entries(fieldAliases).map(([field, aliases]) => {
    const sourceHeader = aliases.map((alias) => sourceHeaders[headerLookup.get(normaliseHeader(alias)) ?? -1]).find(Boolean) ?? null;
    return [field, sourceHeader];
  })) as SecurazeMappingResult["fieldMapping"];
  if (!fieldMapping.serialNumber || !fieldMapping.sourceResult) throw new Error("The Securaze CSV must contain a serial-number field and a result/status field");
  const fieldIndex = (field: keyof typeof fieldMapping) => fieldMapping[field] ? headerLookup.get(normaliseHeader(fieldMapping[field]!)) : undefined;
  const valueFor = (row: string[], field: keyof typeof fieldMapping) => {
    const index = fieldIndex(field);
    return index === undefined ? "" : (row[index] ?? "").trim();
  };
  const seenSerials = new Set<string>();
  const validRows: SecurazeMappedAsset[] = [];
  const exceptions: SecurazeImportException[] = [];
  rows.slice(1).forEach((row, index) => {
    const rowNumber = index + 2;
    const serialNumber = valueFor(row, "serialNumber");
    const sourceResult = valueFor(row, "sourceResult");
    if (!serialNumber) { exceptions.push({ rowNumber, code: "missing_serial", message: "No serial number was supplied" }); return; }
    if (!sourceResult) { exceptions.push({ rowNumber, code: "missing_result", message: "No source result/status was supplied" }); return; }
    const serialKey = serialNumber.toLowerCase();
    if (seenSerials.has(serialKey)) { exceptions.push({ rowNumber, code: "duplicate_serial", message: `Duplicate serial number: ${serialNumber}` }); return; }
    seenSerials.add(serialKey);
    validRows.push({ assetCategory: valueFor(row, "assetCategory") || "Imported asset", manufacturer: valueFor(row, "manufacturer") || undefined, model: valueFor(row, "model") || undefined, assetTag: valueFor(row, "assetTag") || undefined, serialNumber, quantity: 1, sourceRowNumber: rowNumber, sourceResult, dataHandlingState: "evidence_pending" });
  });
  return { mappingVersion: "securaze_csv_v1", fieldMapping, sourceHeaders, validRows, exceptions };
}
