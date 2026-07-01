#!/usr/bin/env node
/** One-time codemod: convert eager page imports in AppRoutes.tsx to React.lazy(). */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "node:url";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const file = path.join(ROOT, "src/AppRoutes.tsx");
let src = fs.readFileSync(file, "utf8");

const LAZY_PREFIXES = [
  "./pages/",
  "@/pages/",
  "./calendar/pages/",
  "./digital-success/",
  "./institutions/pages/",
];

const lines = src.split("\n");
const out = [];
let converted = 0;

for (const line of lines) {
  const m = line.match(/^import (\w+) from "([^"]+)";$/);
  if (m && LAZY_PREFIXES.some((p) => m[2].startsWith(p))) {
    out.push(`const ${m[1]} = lazy(() => import("${m[2]}"));`);
    converted++;
    continue;
  }
  out.push(line);
}

src = out.join("\n");

if (!src.includes("Suspense fallback={<RouteFallback />}")) {
  src = src.replace(
    "export default function AppRoutes() {\n  return (\n            <PerformancePeriodProvider>",
    "export default function AppRoutes() {\n  return (\n    <Suspense fallback={<RouteFallback />}>\n            <PerformancePeriodProvider>",
  );
  src = src.replace(
    /(\n            <\/PerformancePeriodProvider>\n  \);)/,
    "\n            </PerformancePeriodProvider>\n    </Suspense>\n  );",
  );
}

fs.writeFileSync(file, src);
console.log(`[lazyify-app-routes] Converted ${converted} page imports in AppRoutes.tsx`);
