import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { GuideSection } from "../lib/parseGuideSections";

interface Props {
  query: string;
  onQueryChange: (q: string) => void;
  sections: GuideSection[];
  keywords: string[];
  matchCount: number;
}

export function GuideSearchBar({ query, onQueryChange, sections, keywords, matchCount }: Props) {
  const scrollToSection = (sectionId: string) => {
    onQueryChange("");
    requestAnimationFrame(() => {
      document.getElementById(sectionId)?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  };

  return (
    <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b px-6 py-4 space-y-3">
      <div className="relative max-w-2xl">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          placeholder="Search this guide — e.g. publish, permissions, sync, empty review…"
          className="pl-9 pr-9"
        />
        {query && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="absolute right-1 top-1/2 -translate-y-1/2 size-7"
            onClick={() => onQueryChange("")}
            aria-label="Clear search"
          >
            <X className="size-3.5" />
          </Button>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-muted-foreground shrink-0">Quick topics:</span>
        {keywords.map((kw) => (
          <Badge
            key={kw}
            variant={query === kw ? "default" : "secondary"}
            className="cursor-pointer text-xs font-normal hover:bg-primary/20"
            onClick={() => onQueryChange(query === kw ? "" : kw)}
          >
            {kw}
          </Badge>
        ))}
      </div>

      {query && (
        <p className="text-xs text-muted-foreground">
          {matchCount === 0
            ? "No matching sections — try another keyword from the list above."
            : `${matchCount} section${matchCount === 1 ? "" : "s"} match "${query}"`}
          {!query && sections.length > 0 && (
            <span className="ml-2">
              · Jump:
              {sections.slice(0, 4).map((s) => (
                <button
                  key={s.id}
                  type="button"
                  className="ml-2 text-primary hover:underline"
                  onClick={() => scrollToSection(s.id)}
                >
                  {s.title.replace(/^\d+\.\s*/, "")}
                </button>
              ))}
            </span>
          )}
        </p>
      )}
    </div>
  );
}

export const INSTITUTIONS_GUIDE_KEYWORDS = [
  "publish",
  "course finder",
  "permissions",
  "sync",
  "upload",
  "approve",
  "empty review",
  "confidential",
  "agreements",
  "view-only",
  "troubleshoot",
  "onboarding",
];
