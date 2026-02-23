'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'

function ChartTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border border-border/50 bg-background px-3 py-2 text-xs shadow-xl">
      {payload.map((entry: any, i: number) => (
        <div key={i} className="flex items-center gap-2">
          <span
            className="h-2.5 w-2.5 shrink-0 rounded-xs"
            style={{ backgroundColor: entry.payload.fill }}
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

interface WinRateChartProps {
  wins: number
  losses: number
  winRate: number
  title?: string
}

export function WinRateChart({ wins, losses, winRate, title = 'Win Rate' }: WinRateChartProps) {
  const total = wins + losses
  if (total === 0) return null

  const data = [
    { name: 'Wins', value: wins, fill: '#22c55e' },
    { name: 'Losses', value: losses, fill: '#ef4444' },
  ]

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-6">
          <div className="h-36 w-36 relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={40}
                  outerRadius={60}
                  strokeWidth={0}
                >
                  {data.map((entry, i) => (
                    <Cell key={i} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip content={<ChartTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-2xl font-bold">{winRate}%</span>
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-xs bg-green-500" />
              <span className="text-sm text-muted-foreground">Wins</span>
              <span className="text-sm font-bold ml-auto">{wins}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-xs bg-red-500" />
              <span className="text-sm text-muted-foreground">Losses</span>
              <span className="text-sm font-bold ml-auto">{losses}</span>
            </div>
            <div className="pt-1 border-t">
              <span className="text-xs text-muted-foreground">Total: {total} games</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
