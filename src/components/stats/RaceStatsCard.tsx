import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface RaceStatsCardProps {
  raceWins: number
  raceLosses: number
  raceTotal: number
  totalRoundsWon: number
  totalRoundsPlayed: number
  activeRaces: number
}

export function RaceStatsCard({
  raceWins,
  raceLosses,
  raceTotal,
  totalRoundsWon,
  totalRoundsPlayed,
  activeRaces,
}: RaceStatsCardProps) {
  const raceWinRate = raceTotal > 0 ? Math.round((raceWins / raceTotal) * 100) : 0
  const roundWinRate = totalRoundsPlayed > 0 ? Math.round((totalRoundsWon / totalRoundsPlayed) * 100) : 0

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Race Statistics</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Races Won</p>
            <p className="text-2xl font-bold mt-0.5">
              {raceWins}
              <span className="text-sm font-normal text-muted-foreground"> / {raceTotal}</span>
            </p>
            <p className="text-xs text-muted-foreground">{raceWinRate}% win rate</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Rounds Won</p>
            <p className="text-2xl font-bold mt-0.5">
              {totalRoundsWon}
              <span className="text-sm font-normal text-muted-foreground"> / {totalRoundsPlayed}</span>
            </p>
            <p className="text-xs text-muted-foreground">{roundWinRate}% win rate</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Losses</p>
            <p className="text-2xl font-bold mt-0.5">{raceLosses}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Active Races</p>
            <p className="text-2xl font-bold mt-0.5">{activeRaces}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
