/**
 * FIN-R-001 — AppLayout must not remount <main> on route change.
 * Regression for Jun 2026 finance removeChild crash (half-day + 3hr outage).
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const APP_LAYOUT = join(process.cwd(), "src/components/layout/AppLayout.tsx");

describe("FIN-R-001 AppLayout main must not use pathname key", () => {
  it("forbids key={pathname} on <main> (causes removeChild with Radix portals)", () => {
    const src = readFileSync(APP_LAYOUT, "utf8");
    const mainBlock = src.match(/<main[\s\S]*?<\/main>/)?.[0] ?? "";
    expect(mainBlock.length).toBeGreaterThan(0);
    expect(mainBlock).not.toMatch(/key=\{[^}]*pathname/);
    expect(mainBlock).not.toMatch(/key=\{typeof window[^}]*location\.pathname/);
  });
});
