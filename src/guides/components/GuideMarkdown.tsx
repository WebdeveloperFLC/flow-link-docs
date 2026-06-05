import { useMemo, isValidElement, type ReactNode } from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import { cn } from "@/lib/utils";
import { slugify } from "../lib/slugify";
import { GuideVisualBlock } from "./GuideVisuals";

interface Props {
  content: string;
  className?: string;
  highlightQuery?: string;
}

const VISUAL_LANGS = ["flow", "tier", "navmap", "status", "decision"] as const;

function flattenText(node: ReactNode): string {
  if (node == null || typeof node === "boolean") return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(flattenText).join("");
  if (isValidElement(node)) return flattenText(node.props.children);
  return "";
}

function CalloutBlock({ type, children }: { type: string; children: React.ReactNode }) {
  const styles: Record<string, string> = {
    tip: "border-l-4 border-l-success bg-success/5",
    note: "border-l-4 border-l-primary bg-primary/5",
    warning: "border-l-4 border-l-yellow-500 bg-yellow-500/10",
    important: "border-l-4 border-l-destructive bg-destructive/5",
  };
  const labels: Record<string, string> = {
    tip: "Tip",
    note: "Note",
    warning: "Warning",
    important: "Important",
  };
  const key = type.toLowerCase();
  return (
    <div className={cn("my-4 rounded-r-lg p-4 not-prose", styles[key] ?? styles.note)}>
      <div className="text-xs font-bold uppercase tracking-wider mb-1 opacity-80">{labels[key] ?? type}</div>
      <div className="text-sm leading-relaxed space-y-2">{children}</div>
    </div>
  );
}

function highlightText(text: string, query: string): React.ReactNode {
  if (!query.trim()) return text;
  const q = query.trim();
  const re = new RegExp(`(${q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi");
  const parts = text.split(re);
  return parts.map((part, i) =>
    re.test(part) ? (
      <mark key={i} className="bg-yellow-300/60 dark:bg-yellow-500/40 rounded px-0.5">
        {part}
      </mark>
    ) : (
      part
    ),
  );
}

export function GuideMarkdown({ content, className, highlightQuery = "" }: Props) {
  const components = useMemo<Components>(
    () => ({
      h1: ({ children }) => {
        const text = flattenText(children);
        return (
          <h1 id={slugify(text)} className="scroll-mt-24 text-3xl">
            {highlightQuery ? highlightText(text, highlightQuery) : children}
          </h1>
        );
      },
      h2: ({ children }) => {
        const text = flattenText(children);
        return (
          <h2 id={slugify(text)} className="scroll-mt-24 border-b pb-2 mt-10 first:mt-0 text-xl">
            {highlightQuery ? highlightText(text, highlightQuery) : children}
          </h2>
        );
      },
      h3: ({ children }) => {
        const text = flattenText(children);
        return (
          <h3 id={slugify(text)} className="scroll-mt-24 mt-6 text-lg">
            {highlightQuery ? highlightText(text, highlightQuery) : children}
          </h3>
        );
      },
      blockquote: ({ children }) => {
        const raw = flattenText(children).trim();
        const match = raw.match(/^(TIP|NOTE|WARNING|IMPORTANT):?\s*/i);
        if (match) {
          const type = match[1];
          const rest = raw.slice(match[0].length);
          return (
            <CalloutBlock type={type}>
              {highlightQuery ? highlightText(rest, highlightQuery) : rest}
            </CalloutBlock>
          );
        }
        return (
          <blockquote className="border-l-4 border-primary/30 bg-muted/30 rounded-r-lg not-italic px-4 py-2">
            {children}
          </blockquote>
        );
      },
      pre: ({ children }) => {
        if (isValidElement(children)) {
          const codeProps = children.props as { className?: string; children?: ReactNode };
          const cls = codeProps.className ?? "";
          const lang = /language-(\w+)/.exec(cls)?.[1];
          if (lang && (VISUAL_LANGS as readonly string[]).includes(lang)) {
            return (
              <GuideVisualBlock language={lang} content={String(codeProps.children ?? "").replace(/\n$/, "")} />
            );
          }
        }
        return (
          <pre className="my-4 p-4 rounded-lg bg-muted border text-xs overflow-x-auto">
            {children}
          </pre>
        );
      },
      code: ({ className, children, ...props }) => (
        <code className={cn("text-[0.85em]", className)} {...props}>
          {children}
        </code>
      ),
      table: ({ children }) => (
        <div className="my-4 overflow-x-auto rounded-lg border shadow-sm">
          <table className="w-full text-sm">{children}</table>
        </div>
      ),
      th: ({ children }) => (
        <th className="bg-muted/80 px-3 py-2.5 text-left font-semibold border-b text-xs uppercase tracking-wide">
          {children}
        </th>
      ),
      td: ({ children }) => <td className="px-3 py-2.5 border-b border-border/50 align-top">{children}</td>,
    }),
    [highlightQuery],
  );

  return (
    <div
      className={cn(
        "prose prose-sm md:prose-base max-w-none dark:prose-invert",
        "prose-headings:font-semibold prose-p:leading-relaxed",
        "prose-a:text-primary prose-a:no-underline hover:prose-a:underline",
        "prose-strong:text-foreground",
        className,
      )}
    >
      <ReactMarkdown components={components}>{content}</ReactMarkdown>
    </div>
  );
}
