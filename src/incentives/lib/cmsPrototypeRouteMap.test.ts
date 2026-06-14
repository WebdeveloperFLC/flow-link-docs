import { describe, expect, it } from "vitest";
import {
  CMS_PROTOTYPE_MOBILE,
  CMS_PROTOTYPE_MODALS,
  CMS_PROTOTYPE_PAGES,
} from "./cmsPrototypeRouteMap";

describe("cmsPrototypeRouteMap", () => {
  it("maps all prototype page screens (01 + 02a–c + 03–22)", () => {
    expect(CMS_PROTOTYPE_PAGES).toHaveLength(24);
    for (const row of CMS_PROTOTYPE_PAGES) {
      expect(row.route.startsWith("/performance")).toBe(true);
    }
  });

  it("maps modals 23–27", () => {
    expect(CMS_PROTOTYPE_MODALS.map((m) => m.id)).toEqual(["23", "24", "25", "26", "27"]);
  });

  it("maps mobile screens 28–29", () => {
    expect(CMS_PROTOTYPE_MOBILE.map((m) => m.id)).toEqual(["28", "29"]);
  });
});
