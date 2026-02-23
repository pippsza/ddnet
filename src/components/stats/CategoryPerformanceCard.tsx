import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { getCategoryColor } from '@/lib/chart-constants'

interface CategoryPerformanceCardProps {
  categoryStats: Record<string, { wins: number; losses: number; total: number }>
}

export function CategoryPerformanceCard({ categoryStats }: CategoryPerformanceCardProps) {
  const entries = Object.entries(categoryStats).sort(([, a], [, b]) => b.total - a.total)

  if (!entries.length) return null

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Bingo by Category</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {entries.map(([category, stats], i) => {
          const winPct = stats.total > 0 ? Math.round((stats.wins / stats.total) * 100) : 0
          const color = getCategoryColor(category, i)

          return (
            <div key={category} className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-xs"
                    style={{ backgroundColor: color }}
                  />
                  <span className="font-medium capitalize">{category}</span>
                </div>
                <span className="text-muted-foreground text-xs">
                  {stats.wins}W / {stats.losses}L ({winPct}%)
                </span>
              </div>
              <div className="relative h-2 w-full overflow-hidden rounded-full bg-muted">
                {stats.total > 0 && (
                  <>
                    <div
                      className="absolute h-full rounded-full bg-green-500"
                      style={{ width: `${(stats.wins / stats.total) * 100}%` }}
                    />
                    <div
                      className="absolute h-full bg-red-500"
                      style={{
                        left: `${(stats.wins / stats.total) * 100}%`,
                        width: `${(stats.losses / stats.total) * 100}%`,
                      }}
                    />
                  </>
                )}
              </div>
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}
