import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { DDStatsPlayerData } from '@/lib/ddstats-types'

interface FavoritePartnersCardProps {
  data: DDStatsPlayerData['favourite_teammates']
  limit?: number
}

export function FavoritePartnersCard({ data, limit = 20 }: FavoritePartnersCardProps) {
  if (!data?.length) return null

  const items = data.slice(0, limit)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Favorite Partners</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-2">
          {items.map((partner) => (
            <Link
              key={partner.name}
              href={`/app/players/${encodeURIComponent(partner.name)}`}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-muted hover:bg-muted/80 transition-colors text-sm"
            >
              <span className="font-medium">{partner.name}</span>
              <span className="text-xs text-muted-foreground">
                {partner.ranks_together} ranks
              </span>
            </Link>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
