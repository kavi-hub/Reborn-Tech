import { describe, expect, it } from "vitest";
import { toggleCurrentArchivePageSelection } from "../shared/clientArchiveSelection";

describe("client archive current-page selection", () => {
  it("selects and deselects every visible page item without modifying other page selections", () => {
    expect(toggleCurrentArchivePageSelection([9], [1, 2, 3])).toEqual({ selectedIds: [9, 1, 2, 3], capped: false });
    expect(toggleCurrentArchivePageSelection([9, 1, 2, 3], [1, 2, 3])).toEqual({ selectedIds: [9], capped: false });
  });

  it("preserves the existing selection when current-page selection would exceed the export limit", () => {
    expect(toggleCurrentArchivePageSelection([1, 2, 3, 4, 5, 6, 7, 8], [9, 10, 11])).toEqual({ selectedIds: [1, 2, 3, 4, 5, 6, 7, 8], capped: true });
  });
});
