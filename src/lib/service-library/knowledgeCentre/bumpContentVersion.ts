import type { KnowledgeCentreMetadata } from "./types";

export type BumpContentVersionOptions = {
  author: string;
  summary: string;
  /** Defaults to locale date string, e.g. "Updated 29 Jun 2026". */
  date?: string;
  /** When true, bumps patch segment (v2.4 → v2.5). Default true. */
  incrementPatch?: boolean;
};

function formatUpdatedLabel(date: Date): string {
  const day = date.getDate();
  const month = date.toLocaleString("en-GB", { month: "short" });
  const year = date.getFullYear();
  return `Updated ${day} ${month} ${year}`;
}

function nextVersionLabel(current: string | undefined, incrementPatch: boolean): string {
  const raw = (current ?? "v1.0").trim();
  const match = /^v?(\d+)\.(\d+)(?:\.(\d+))?$/i.exec(raw);
  if (!match || !incrementPatch) {
    return raw.startsWith("v") ? raw : `v${raw}`;
  }
  const major = Number(match[1]);
  const minor = Number(match[2]);
  const patch = match[3] != null ? Number(match[3]) : null;
  if (patch != null) {
    return `v${major}.${minor}.${patch + 1}`;
  }
  return `v${major}.${minor + 1}`;
}

/** Append changelog entry and bump version fields after a successful section save. */
export function bumpContentVersion(
  meta: KnowledgeCentreMetadata,
  opts: BumpContentVersionOptions,
): KnowledgeCentreMetadata {
  const now = opts.date ? new Date(opts.date) : new Date();
  const dateLabel = Number.isNaN(now.getTime())
    ? opts.date ?? formatUpdatedLabel(new Date())
    : formatUpdatedLabel(now);
  const version = nextVersionLabel(meta.version, opts.incrementPatch !== false);
  const entry = {
    version,
    date: dateLabel.replace(/^Updated\s+/i, ""),
    author: opts.author,
    summary: opts.summary,
  };

  return {
    ...meta,
    version,
    updatedLabel: dateLabel,
    changelog: [entry, ...(meta.changelog ?? [])],
  };
}
