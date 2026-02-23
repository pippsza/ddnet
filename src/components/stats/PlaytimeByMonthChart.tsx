'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
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

interface PlaytimeByMonthChartProps {
  data: DDStatsPlayerData['playtime_per_month']
}

export function PlaytimeByMonthChart({ data }: PlaytimeByMonthChartProps) {
  if (!data?.length) return null

  const chartData = data.slice(-24).map((m) => ({
    month: m.month || m.year_month,
    hours: +(m.seconds_played / 3600).toFixed(1),
  }))

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Playtime by Month</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
              <XAxis
                dataKey="month"
                tick={{ fontSize: 10 }}
                angle={-45}
                textAnchor="end"
                height={50}
                interval="preserveStartEnd"
              />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip content={<ChartTooltip />} cursor={{ fill: 'hsl(var(--muted))' }} />
              <Bar dataKey="hours" name="Hours" fill="#38bdf8" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}
