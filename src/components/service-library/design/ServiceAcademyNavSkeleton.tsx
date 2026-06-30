import { Skeleton } from "@/components/ui/skeleton";

export function ServiceAcademyNavSkeleton({ variant = "countries" }: { variant?: "countries" | "services" }) {
  return (
    <div className="flex-1 overflow-y-auto px-6 md:px-10 py-8 md:py-10 max-w-5xl mx-auto w-full">
      <Skeleton className="h-4 w-24 mb-6" />
      <div className="flex gap-2 mb-8">
        <Skeleton className="h-7 w-24 rounded-full" />
        <Skeleton className="h-7 w-24 rounded-full" />
      </div>
      <Skeleton className="h-8 w-64 mb-2" />
      <Skeleton className="h-4 w-96 max-w-full mb-8" />
      {variant === "countries" ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {Array.from({ length: 9 }).map((_, i) => (
            <Skeleton key={i} className="h-[72px] rounded-xl" />
          ))}
        </div>
      ) : (
        <div className="grid gap-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-14 rounded-xl" />
          ))}
        </div>
      )}
    </div>
  );
}
