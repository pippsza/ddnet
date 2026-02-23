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
import { formatHours } from '@/lib/format-utils'
import type { DDStatsPlayerData } from '@/lib/ddstats-types'

interface MostPlayedMapsTableProps {
  data: DDStatsPlayerData['most_played_maps']
  limit?: number
}

export function MostPlayedMapsTable({ data, limit = 15 }: MostPlayedMapsTableProps) {
  if (!data?.length) return null

  const items = data.slice(0, limit)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Most Played Maps</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Map</TableHead>
              <TableHead>Category</TableHead>
              <TableHead className="text-center">Stars</TableHead>
              <TableHead className="text-right">Playtime</TableHead>
              <TableHead className="hidden sm:table-cell">Mapper</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((entry) => (
              <TableRow key={entry.map_name}>
                <TableCell className="font-medium">{entry.map_name}</TableCell>
                <TableCell className="text-muted-foreground">{entry.map?.server ?? '—'}</TableCell>
                <TableCell className="text-center">
                  {entry.map?.stars ? '★'.repeat(entry.map.stars) : '—'}
                </TableCell>
                <TableCell className="text-right font-mono text-sm">
                  {formatHours(entry.seconds_played)}
                </TableCell>
                <TableCell className="hidden sm:table-cell text-muted-foreground text-xs">
                  {entry.map?.mapper ?? '—'}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
