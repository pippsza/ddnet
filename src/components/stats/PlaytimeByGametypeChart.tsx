'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'
import { getCategoryColor } from '@/lib/chart-constants'
import type { DDStatsPlayerData } from '@/lib/ddstats-types'

function ChartTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null
  const entry = payload[0]
  return (
    <div className="rounded-lg border border-border/50 bg-background px-3 py-2 text-xs shadow-xl">
      <div className="flex items-center gap-2">
        <span
          className="h-2.5 w-2.5 shrink-0 rounded-xs"
          style={{ backgroundColor: entry.payload.fill }}
        />
        <span className="text-muted-foreground">{entry.name}</span>
        <span className="font-mono font-medium text-foreground ml-auto">
          {entry.payload.hoursLabel}
        </span>
      </div>
      <div className="text-muted-foreground mt-1 text-right">
        {entry.payload.percent}%
      </div>
    </div>
  )
}

interface PlaytimeByGametypeChartProps {
  data: DDStatsPlayerData['most_played_gametypes']
}

export function PlaytimeByGametypeChart({ data }: PlaytimeByGametypeChartProps) {
  if (!data?.length) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Most Played Gametypes</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-8">No gametype data yet</p>
        </CardContent>
      </Card>
    )
  }

  const totalSeconds = data.reduce((sum, d) => sum + d.seconds_played, 0)

  // Take top 8, group the rest as "Other"
  const top = data.slice(0, 8)
  const rest = data.slice(8)
  const otherSeconds = rest.reduce((sum, d) => sum + d.seconds_played, 0)

  const chartData = top.map((item, i) => {
    const hours = item.seconds_played / 3600
    return {
      name: item.key,
      value: item.seconds_played,
      hoursLabel: hours >= 1 ? `${hours.toFixed(1)}h` : `${Math.round(hours * 60)}m`,
      percent: ((item.seconds_played / totalSeconds) * 100).toFixed(1),
      fill: getCategoryColor(item.key, i),
    }
  })

  if (otherSeconds > 0) {
    const hours = otherSeconds / 3600
    chartData.push({
      name: 'Other',
      value: otherSeconds,
      hoursLabel: hours >= 1 ? `${hours.toFixed(1)}h` : `${Math.round(hours * 60)}m`,
      percent: ((otherSeconds / totalSeconds) * 100).toFixed(1),
      fill: '#6b7280',
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Most Played Gametypes</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-4">
          <div className="h-44 w-44 shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={45}
                  outerRadius={70}
                  strokeWidth={0}
                >
                  {chartData.map((entry, i) => (
                    <Cell key={i} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip content={<ChartTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex-1 min-w-0 space-y-1.5 max-h-44 overflow-y-auto">
            {chartData.map((entry) => (
              <div key={entry.name} className="flex items-center gap-2 text-sm">
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-xs"
                  style={{ backgroundColor: entry.fill }}
                />
                <span className="text-muted-foreground truncate">{entry.name}</span>
                <span className="font-mono text-xs font-medium ml-auto shrink-0">
                  {entry.hoursLabel}
                </span>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
