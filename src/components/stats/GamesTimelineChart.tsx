'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'
import type { MonthlyGameData } from '@/hooks/use-game-stats'

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border border-border/50 bg-background px-3 py-2 text-xs shadow-xl">
      {label && <p className="font-medium text-foreground mb-1">{label}</p>}
      {payload.map((entry: any, i: number) => (
        <div key={i} className="flex items-center gap-2">
          <span
            className="h-2.5 w-2.5 shrink-0 rounded-xs"
            style={{ backgroundColor: entry.fill }}
          />
          <span className="text-muted-foreground">{entry.name}</span>
          <span className="font-mono font-medium text-foreground ml-auto">
            {entry.value}
          </span>
        </div>
      ))}
    </div>
  )
}

interface GamesTimelineChartProps {
  data: MonthlyGameData[]
}

export function GamesTimelineChart({ data }: GamesTimelineChartProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Games Over Time</CardTitle>
      </CardHeader>
      <CardContent>
        {data?.length ? (
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip content={<ChartTooltip />} cursor={{ fill: 'hsl(var(--muted))' }} />
                <Legend
                  wrapperStyle={{ fontSize: 12 }}
                  formatter={(value: string) => <span className="text-muted-foreground">{value}</span>}
                />
                <Bar dataKey="wins" name="Wins" fill="#22c55e" stackId="games" radius={[0, 0, 0, 0]} />
                <Bar dataKey="losses" name="Losses" fill="#ef4444" stackId="games" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-8">No game history yet</p>
        )}
      </CardContent>
    </Card>
  )
}
