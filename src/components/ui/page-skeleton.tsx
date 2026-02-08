import { Skeleton } from '@/components/ui/skeleton'

export function DashboardSkeleton() {
  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Profile card */}
      <div className="rounded-xl border bg-card p-6">
        <div className="flex items-center gap-6">
          <Skeleton className="w-16 h-16 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-7 w-40" />
            <Skeleton className="h-4 w-24" />
          </div>
        </div>
      </div>
      {/* Stats grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-xl border bg-card p-4">
            <Skeleton className="h-4 w-20 mb-2" />
            <Skeleton className="h-8 w-16" />
          </div>
        ))}
      </div>
      {/* Action cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="rounded-xl border bg-card p-6 space-y-3">
            <Skeleton className="h-5 w-24" />
            <Skeleton className="h-4 w-full" />
            <div className="flex gap-2">
              <Skeleton className="h-9 w-28" />
              <Skeleton className="h-9 w-28" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export function CardListSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="space-y-4 animate-in fade-in duration-300">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-xl border bg-card p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Skeleton className="w-10 h-10 rounded-full" />
              <div className="space-y-2">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-3 w-48" />
              </div>
            </div>
            <Skeleton className="h-8 w-20" />
          </div>
        </div>
      ))}
    </div>
  )
}

export function PlayerGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 animate-in fade-in duration-300">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-xl border bg-card p-4 space-y-3">
          <div className="flex items-center gap-3">
            <Skeleton className="w-12 h-12 rounded-full" />
            <div className="space-y-1.5">
              <Skeleton className="h-5 w-24" />
              <Skeleton className="h-3 w-16" />
            </div>
          </div>
          <div className="flex justify-between">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-12" />
          </div>
        </div>
      ))}
    </div>
  )
}

export function DetailPageSkeleton() {
  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="rounded-xl border bg-card p-6">
        <div className="flex items-center gap-6">
          <Skeleton className="w-24 h-24 rounded-full" />
          <div className="space-y-2 flex-1">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-32" />
            <div className="flex gap-2 mt-2">
              <Skeleton className="h-6 w-16" />
              <Skeleton className="h-6 w-20" />
            </div>
          </div>
        </div>
      </div>
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-xl border bg-card p-4">
            <Skeleton className="h-3 w-16 mb-2" />
            <Skeleton className="h-7 w-20" />
          </div>
        ))}
      </div>
      {/* Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="rounded-xl border bg-card p-6">
            <Skeleton className="h-5 w-32 mb-4" />
            <Skeleton className="h-48 w-full rounded" />
          </div>
        ))}
      </div>
    </div>
  )
}

export function GamePageSkeleton() {
  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-7 w-56" />
          <Skeleton className="h-4 w-36" />
        </div>
        <Skeleton className="h-6 w-24" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 rounded-xl border bg-card p-6">
          <Skeleton className="h-64 w-full rounded" />
        </div>
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="rounded-xl border bg-card p-4">
              <div className="flex items-center gap-3">
                <Skeleton className="w-10 h-10 rounded-full" />
                <div className="space-y-1.5">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-3 w-16" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
