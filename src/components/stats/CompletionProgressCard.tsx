import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { getCategoryColor } from '@/lib/chart-constants'
import type { DDStatsPlayerData } from '@/lib/ddstats-types'

interface CompletionProgressCardProps {
  data: DDStatsPlayerData['completion_progress']
  compact?: boolean
}

export function CompletionProgressCard({ data, compact = false }: CompletionProgressCardProps) {
  if (!data?.length) return null

  const items = compact ? data.slice(0, 5) : data

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Completion Progress</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {items.map((cat, i) => {
          const pct = cat.maps_total > 0 ? (cat.maps_finished / cat.maps_total) * 100 : 0
          const color = getCategoryColor(cat.category, i)
          return (
            <div key={cat.category} className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">{cat.category}</span>
                <span className="text-muted-foreground text-xs">
                  {cat.maps_finished} / {cat.maps_total}
                </span>
              </div>
              <div className="relative h-2 w-full overflow-hidden rounded-full bg-primary/20">
                <div
                  className="h-full rounded-full transition-all"
                  style={{ width: `${pct}%`, backgroundColor: color }}
                />
              </div>
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}
