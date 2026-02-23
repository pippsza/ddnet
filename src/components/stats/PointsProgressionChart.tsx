'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  AreaChart,
  Area,
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
            {typeof entry.value === 'number' ? entry.value.toLocaleString() : entry.value}
          </span>
        </div>
      ))}
    </div>
  )
}

interface PointsProgressionChartProps {
  data: DDStatsPlayerData['points_graph']
  compact?: boolean
}

export function PointsProgressionChart({ data, compact = false }: PointsProgressionChartProps) {
  if (!data?.length) return null

  const chartData = compact ? data.slice(-50) : data

  const content = (
    <div className={compact ? 'h-40' : 'h-72'}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ top: 5, right: 5, bottom: 5, left: compact ? 0 : 5 }}>
          <defs>
            <linearGradient id="pointsGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.35} />
              <stop offset="95%" stopColor="#38bdf8" stopOpacity={0} />
            </linearGradient>
          </defs>
          {!compact && (
            <>
              <XAxis
                dataKey="date"
                tick={{ fontSize: 11 }}
                tickFormatter={(v) => {
                  const d = new Date(v)
                  return d.toLocaleDateString(undefined, { month: 'short', year: '2-digit' })
                }}
                interval="preserveStartEnd"
              />
              <YAxis tick={{ fontSize: 11 }} />
            </>
          )}
          <Tooltip content={<ChartTooltip />} />
          <Area
            type="monotone"
            dataKey="points"
            name="Points"
            stroke="#38bdf8"
            fill="url(#pointsGradient)"
            strokeWidth={2}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )

  if (compact) return content

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Points Progression</CardTitle>
      </CardHeader>
      <CardContent>{content}</CardContent>
    </Card>
  )
}
