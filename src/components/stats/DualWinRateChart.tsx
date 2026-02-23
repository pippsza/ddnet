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

interface DualWinRateChartProps {
  bingoWins: number
  bingoLosses: number
  raceWins: number
  raceLosses: number
}

function MiniDonut({
  wins,
  losses,
  label,
}: {
  wins: number
  losses: number
  label: string
}) {
  const total = wins + losses
  const winRate = total > 0 ? Math.round((wins / total) * 100) : 0

  const data =
    total > 0
      ? [
          { name: 'Wins', value: wins, fill: '#22c55e' },
          { name: 'Losses', value: losses, fill: '#ef4444' },
        ]
      : [{ name: 'No games', value: 1, fill: 'hsl(var(--muted))' }]

  return (
    <div className="flex flex-col items-center gap-2 flex-1">
      <div className="h-28 w-28 relative">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              innerRadius={32}
              outerRadius={48}
              strokeWidth={0}
            >
              {data.map((entry, i) => (
                <Cell key={i} fill={entry.fill} />
              ))}
            </Pie>
            {total > 0 && <Tooltip content={<ChartTooltip />} />}
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-lg font-bold">{total > 0 ? `${winRate}%` : '—'}</span>
        </div>
      </div>
      <div className="text-center">
        <p className="text-sm font-medium">{label}</p>
        <p className="text-xs text-muted-foreground">
          {total > 0 ? `${wins}W / ${losses}L` : 'No games'}
        </p>
      </div>
    </div>
  )
}

export function DualWinRateChart({
  bingoWins,
  bingoLosses,
  raceWins,
  raceLosses,
}: DualWinRateChartProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Win Rate</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-start justify-center gap-4">
          <MiniDonut wins={bingoWins} losses={bingoLosses} label="Bingo" />
          <MiniDonut wins={raceWins} losses={raceLosses} label="Race" />
        </div>
      </CardContent>
    </Card>
  )
}
