const Bar = ({ className = "" }: { className?: string }) => (
  <div className={`animate-shimmer rounded-md ${className}`} />
);

export default function AccountingTableSkeleton({ rows = 6, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <div className="rounded-lg border border-border overflow-hidden">
      <div className="grid bg-muted/40 px-4 py-2.5" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
        {Array.from({ length: cols }).map((_, i) => <Bar key={i} className="h-3 w-20" />)}
      </div>
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="grid border-t border-border px-4 py-3" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
          {Array.from({ length: cols }).map((_, c) => <Bar key={c} className="h-3 w-24" />)}
        </div>
      ))}
    </div>
  );
}