import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { getCategoryColor } from '@/lib/chart-constants'
import type { DDStatsPlayerData } from '@/lib/ddstats-types'

interface PointsBreakdownCardProps {
  points: DDStatsPlayerData['points']
}

export function PointsBreakdownCard({ points }: PointsBreakdownCardProps) {
  if (!points) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Points Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-4">No points data yet</p>
        </CardContent>
      </Card>
    )
  }

  const periodStats = [
    { label: 'This Week', data: points.weekly_points },
    { label: 'This Month', data: points.monthly_points },
    { label: 'This Year', data: points.yearly_points },
  ].filter((s) => s.data && s.data.points > 0)

  const categoryEntries = Object.entries(points.points)
    .filter(([, v]) => v && v.points > 0)
    .sort(([, a], [, b]) => b.points - a.points)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Points Breakdown</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {periodStats.length > 0 && (
          <div className="flex gap-4 flex-wrap">
            {periodStats.map((stat) => (
              <div key={stat.label} className="text-center">
                <p className="text-xs text-muted-foreground">{stat.label}</p>
                <p className="text-lg font-bold">+{stat.data.points.toLocaleString()}</p>
                {stat.data.rank > 0 && (
                  <p className="text-xs text-muted-foreground">#{stat.data.rank}</p>
                )}
              </div>
            ))}
          </div>
        )}

        {categoryEntries.length > 0 && (
          <div className="flex flex-col gap-2">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">By Category</p>
            <div className="flex flex-col gap-1.5">
              {categoryEntries.map(([cat, data], i) => (
                <div key={cat} className="flex items-center gap-2 text-sm ">
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-xs"
                    style={{ backgroundColor: getCategoryColor(cat, i + 1) }}
                  />
                  <span className="shrink-0">{cat}</span>
                  <span className="flex-1 border-b border-dotted border-muted-foreground/30" />
                  <span className="font-mono font-medium shrink-0">
                    {data.points.toLocaleString()}
                  </span>
                  {data.rank > 0 && (
                    <span className="text-xs text-muted-foreground shrink-0">#{data.rank}</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
