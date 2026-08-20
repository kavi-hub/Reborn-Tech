import { describe, expect, it } from "vitest";
import { hasUniqueOperationsNavigation, operationsNavigation } from "../client/src/lib/operationsNavigation";

describe("Operations navigation", () => {
  it("uses one unique route and React key per operations destination", () => {
    expect(hasUniqueOperationsNavigation()).toBe(true);
    expect(operationsNavigation.map((item) => item.path)).toEqual(["/operations", "/operations/collections", "/bulk/itad-dash"]);
  });
});
