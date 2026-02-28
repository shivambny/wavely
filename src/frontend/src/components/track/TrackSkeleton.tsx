import { Skeleton } from "@/components/ui/skeleton";

export function TrackCardSkeleton() {
  return (
    <div className="cursor-pointer">
      <Skeleton className="aspect-square rounded-2xl mb-3 bg-white/5" />
      <Skeleton className="h-3.5 w-3/4 rounded-full mb-1.5 bg-white/5" />
      <Skeleton className="h-3 w-1/2 rounded-full bg-white/5" />
    </div>
  );
}

export function TrackListSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-1">
      {Array.from({ length: count }).map((_, i) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: skeleton items are static
        <div key={i} className="flex items-center gap-3 px-3 py-2">
          <Skeleton className="w-10 h-10 rounded-lg bg-white/5 flex-shrink-0" />
          <div className="flex-1 min-w-0 space-y-1.5">
            <Skeleton className="h-3.5 w-2/3 rounded-full bg-white/5" />
            <Skeleton className="h-3 w-1/3 rounded-full bg-white/5" />
          </div>
          <Skeleton className="h-3 w-8 rounded-full bg-white/5" />
        </div>
      ))}
    </div>
  );
}

export function GridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: skeleton items are static
        <TrackCardSkeleton key={i} />
      ))}
    </div>
  );
}
