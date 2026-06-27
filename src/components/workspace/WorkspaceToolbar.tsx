import { cn } from "@/lib/utils";

/**
 * Standard workspace action row — New, Import, Export, Bulk, AI, Filters, Saved Views.
 * Pass actions as children in consistent order across Institution / Program / Course Finder workspaces.
 */
export function WorkspaceToolbar({
  children,
  className,
  trailing,
}: {
  children?: React.ReactNode;
  className?: string;
  /** Right-aligned slot (e.g. bulk selection count). */
  trailing?: React.ReactNode;
}) {
  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      {children}
      {trailing ? <div className="flex-1 min-w-[1rem]" /> : null}
      {trailing}
    </div>
  );
}
