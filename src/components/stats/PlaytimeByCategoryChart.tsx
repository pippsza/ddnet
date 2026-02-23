'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts'
import { getCategoryColor } from '@/lib/chart-constants'
import type { DDStatsPlayerData } from '@/lib/ddstats-types'

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border border-border/50 bg-background px-3 py-2 text-xs shadow-xl">
      {label && <p className="font-medium text-foreground mb-1">{label}</p>}
      {payload.map((entry: any, i: number) => (
        <div key={i} className="flex items-center gap-2">
          <span
            className="h-2.5 w-2.5 shrink-0 rounded-xs"
            style={{ backgroundColor: entry.color || entry.fill }}
          />
          <span className="text-muted-foreground">{entry.name}</span>
          <span className="font-mono font-medium text-foreground ml-auto">
            {typeof entry.value === 'number' ? `${entry.value.toFixed(1)}h` : entry.value}
          </span>
        </div>
      ))}
    </div>
  )
}

interface PlaytimeByCategoryChartProps {
  data: DDStatsPlayerData['most_played_categories']
}

export function PlaytimeByCategoryChart({ data }: PlaytimeByCategoryChartProps) {
  if (!data?.length) return null

  const chartData = data.map((cat) => ({
    category: cat.key,
    hours: +(cat.seconds_played / 3600).toFixed(1),
  }))

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Playtime by Category</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} layout="vertical" margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
              <XAxis type="number" tick={{ fontSize: 11 }} />
              <YAxis
                type="category"
                dataKey="category"
                tick={{ fontSize: 11 }}
                width={80}
              />
              <Tooltip content={<ChartTooltip />} cursor={{ fill: 'hsl(var(--muted))' }} />
              <Bar dataKey="hours" name="Hours" radius={[0, 4, 4, 0]}>
                {chartData.map((entry, index) => (
                  <Cell key={entry.category} fill={getCategoryColor(entry.category, index)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}
