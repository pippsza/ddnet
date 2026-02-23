import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { GameHistoryItem } from '@/hooks/use-game-stats'

interface RecentGamesCardProps {
  games: GameHistoryItem[]
  limit?: number
}

export function RecentGamesCard({ games, limit = 10 }: RecentGamesCardProps) {
  const completed = games
    .filter((g) => g.status === 'completed' || g.status === 'cancelled')
    .slice(0, limit)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Recent Games</CardTitle>
      </CardHeader>
      <CardContent>
        {completed.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">No completed games yet</p>
        ) : (
        <div className="space-y-1">
          {completed.map((game) => {
            const href = game.type === 'bingo'
              ? `/app/bingo/${game.id}`
              : `/app/race/${game.id}`

            return (
              <Link
                key={`${game.type}-${game.id}`}
                href={href}
                className="flex items-center justify-between gap-2 py-2 px-3 rounded-md hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className={`
                    inline-flex items-center justify-center w-6 h-6 rounded text-xs font-bold shrink-0
                    ${game.type === 'bingo' ? 'bg-primary/10 text-primary' : 'bg-amber-500/10 text-amber-500'}
                  `}>
                    {game.type === 'bingo' ? 'B' : 'R'}
                  </span>
                  <div className="min-w-0">
                    <span className="text-sm font-medium truncate block">{game.title}</span>
                    <span className="text-xs text-muted-foreground capitalize">{game.category}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {game.status === 'completed' && game.isWinner !== null && (
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded ${
                      game.isWinner
                        ? 'bg-green-500/10 text-green-500'
                        : 'bg-red-500/10 text-red-500'
                    }`}>
                      {game.isWinner ? 'WIN' : 'LOSS'}
                    </span>
                  )}
                  {game.status === 'cancelled' && (
                    <span className="text-xs text-muted-foreground px-2 py-0.5 rounded bg-muted">
                      Cancelled
                    </span>
                  )}
                  <span className="text-xs text-muted-foreground hidden sm:inline">
                    {new Date(game.completedAt || game.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </Link>
            )
          })}
        </div>
        )}
      </CardContent>
    </Card>
  )
}
