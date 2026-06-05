import ReactMarkdown from "react-markdown";
import { cn } from "@/lib/utils";

interface Props {
  content: string;
  className?: string;
}

export function GuideMarkdown({ content, className }: Props) {
  return (
    <div
      className={cn(
        "prose prose-sm md:prose-base max-w-none dark:prose-invert",
        "prose-headings:scroll-mt-24 prose-headings:font-semibold",
        "prose-a:text-primary prose-a:no-underline hover:prose-a:underline",
        "prose-code:bg-muted prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:text-[0.85em]",
        "prose-pre:bg-muted prose-pre:border prose-pre:border-border",
        "prose-table:text-sm prose-th:bg-muted/50",
        className,
      )}
    >
      <ReactMarkdown>{content}</ReactMarkdown>
    </div>
  );
}
