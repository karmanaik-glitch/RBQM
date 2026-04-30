interface SkeletonProps {
  className?: string
}

export function Skeleton({ className = '' }: SkeletonProps) {
  return (
    <div className={`animate-pulse bg-white/[0.06] rounded-lg ${className}`} />
  )
}

/** Skeleton matching the SiteDetailPanel layout */
export function SiteDetailSkeleton() {
  return (
    <div className="w-full p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-6 w-48" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-6 w-20 rounded-full" />
          <Skeleton className="h-6 w-12" />
          <Skeleton className="h-6 w-12" />
        </div>
      </div>
      {/* Column Headers */}
      <div className="flex gap-6">
        <Skeleton className="h-3 w-10" />
        <Skeleton className="h-3 w-32" />
        <Skeleton className="h-3 w-16" />
        <Skeleton className="h-3 w-16" />
      </div>
      {/* Domain sections */}
      {[1, 2, 3].map(i => (
        <div key={i} className="space-y-3">
          <Skeleton className="h-8 w-full rounded-xl" />
          {[1, 2, 3].map(j => (
            <div key={j} className="flex items-center gap-4 px-4">
              <Skeleton className="h-4 w-10" />
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-5 w-16 rounded-full" />
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}

/** Skeleton matching the RecentActivity feed */
export function ActivitySkeleton() {
  return (
    <div className="p-4 space-y-3">
      <div className="flex items-center justify-between">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-4 w-10 rounded-full" />
      </div>
      {[1, 2, 3, 4, 5].map(i => (
        <div key={i} className="flex items-start gap-3 p-3">
          <Skeleton className="h-8 w-8 rounded-lg flex-shrink-0" />
          <div className="flex-1 space-y-1.5">
            <div className="flex justify-between">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-3 w-12" />
            </div>
            <Skeleton className="h-3 w-full" />
          </div>
        </div>
      ))}
    </div>
  )
}

/** Skeleton for the Dashboard top-level stats */
export function StatsSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {[1, 2, 3, 4].map(i => (
        <div key={i} className="glass-card p-6 space-y-4">
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-8 w-12" />
            </div>
            <Skeleton className="h-10 w-10 rounded-xl" />
          </div>
          <Skeleton className="h-1 w-full rounded-full" />
        </div>
      ))}
    </div>
  )
}

/** Skeleton for the Heatmap grid */
export function HeatmapSkeleton() {
  return (
    <div className="p-6 space-y-4">
      <Skeleton className="h-6 w-40" />
      <div className="grid grid-cols-6 gap-3">
        {Array.from({ length: 24 }).map((_, i) => (
          <Skeleton key={i} className="h-16 rounded-xl" />
        ))}
      </div>
    </div>
  )
}
