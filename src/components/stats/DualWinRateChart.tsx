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
  kogBingoWins?: number
  kogBingoLosses?: number
  kogRaceWins?: number
  kogRaceLosses?: number
}

function MiniDonut({
  wins,
  losses,
  label,
  accentColor,
}: {
  wins: number
  losses: number
  label: string
  accentColor: string
}) {
  const total = wins + losses
  const winRate = total > 0 ? Math.round((wins / total) * 100) : 0

  const data =
    total > 0
      ? [
          { name: 'Wins', value: wins, fill: accentColor },
          { name: 'Losses', value: losses, fill: '#ef4444' },
        ]
      : [{ name: 'No games', value: 1, fill: 'hsl(var(--muted))' }]

  return (
    <div className="flex flex-col items-center gap-2 flex-1">
      <div className="h-24 w-24 relative">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              innerRadius={28}
              outerRadius={42}
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
          <span className="text-base font-bold">{total > 0 ? `${winRate}%` : '—'}</span>
        </div>
      </div>
      <div className="text-center">
        <p className="text-xs font-medium flex items-center justify-center gap-1">
          <span className="inline-block w-2 h-2 rounded-full" style={{ backgroundColor: accentColor }} />
          {label}
        </p>
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
  kogBingoWins = 0,
  kogBingoLosses = 0,
  kogRaceWins = 0,
  kogRaceLosses = 0,
}: DualWinRateChartProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Win Rate</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <MiniDonut wins={bingoWins} losses={bingoLosses} label="DDNet Bingo" accentColor="#3b82f6" />
          <MiniDonut wins={raceWins} losses={raceLosses} label="DDNet Race" accentColor="#10b981" />
          <MiniDonut wins={kogBingoWins} losses={kogBingoLosses} label="KoG Bingo" accentColor="#a855f7" />
          <MiniDonut wins={kogRaceWins} losses={kogRaceLosses} label="KoG Race" accentColor="#f97316" />
        </div>
      </CardContent>
    </Card>
  )
}
