#!/usr/bin/env node
/**
 * Build Canada Student Visa import JSON from the frozen gold-standard markdown.
 * Output: content/service-library/canada-student-visa-outside-canada.json
 */
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const result = spawnSync("npx", ["vitest", "run", "src/knowledge-centre/lib/parseGoldStandardMarkdown.test.ts"], {
  cwd: ROOT,
  stdio: "inherit",
  shell: true,
});
process.exit(result.status ?? 1);
