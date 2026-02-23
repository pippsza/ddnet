'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { formatTime, formatDateShort } from '@/lib/format-utils'
import type { DDStatsPlayerData } from '@/lib/ddstats-types'

interface RecentFinishesTableProps {
  data: DDStatsPlayerData['recent_finishes']
  limit?: number
}

export function RecentFinishesTable({ data, limit = 15 }: RecentFinishesTableProps) {
  if (!data?.length) return null

  const items = data.slice(0, limit)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Recent Finishes</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Map</TableHead>
              <TableHead>Category</TableHead>
              <TableHead className="text-right">Time</TableHead>
              <TableHead className="text-right">Rank</TableHead>
              <TableHead className="text-right hidden sm:table-cell">Team Rank</TableHead>
              <TableHead className="text-right">Date</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((finish, i) => (
              <TableRow key={`${finish.map?.map}-${finish.timestamp}-${i}`}>
                <TableCell className="font-medium">{finish.map?.map ?? '—'}</TableCell>
                <TableCell className="text-muted-foreground">{finish.map?.server ?? '—'}</TableCell>
                <TableCell className="text-right font-mono text-sm">
                  {formatTime(finish.time)}
                </TableCell>
                <TableCell className="text-right">
                  {finish.rank ? (
                    <span className={finish.rank.rank <= 10 ? 'text-amber-500 font-semibold' : ''}>
                      #{finish.rank.rank}
                    </span>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell className="text-right hidden sm:table-cell">
                  {finish.team_rank ? (
                    <span className={finish.team_rank.rank <= 10 ? 'text-amber-500 font-semibold' : ''}>
                      #{finish.team_rank.rank}
                    </span>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell className="text-right text-muted-foreground text-xs">
                  {formatDateShort(finish.timestamp)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
