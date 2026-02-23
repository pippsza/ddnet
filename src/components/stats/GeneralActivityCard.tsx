import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatPlaytime, formatDateShort } from '@/lib/format-utils'
import type { DDStatsPlayerData } from '@/lib/ddstats-types'

interface GeneralActivityCardProps {
  activity: DDStatsPlayerData['general_activity']
  recentPlayerInfo?: DDStatsPlayerData['recent_player_info']
}

export function GeneralActivityCard({ activity, recentPlayerInfo }: GeneralActivityCardProps) {
  if (!activity) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-4">No activity data yet</p>
        </CardContent>
      </Card>
    )
  }

  const lastSeen = recentPlayerInfo?.[0]?.last_seen

  const stats = [
    { label: 'Total Playtime', value: formatPlaytime(activity.total_seconds_played) },
    { label: 'Playing Since', value: formatDateShort(activity.start_of_playtime) },
    { label: 'Avg per Day', value: formatPlaytime(activity.average_seconds_played) },
    ...(lastSeen ? [{ label: 'Last Seen', value: formatDateShort(lastSeen) }] : []),
  ]

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Activity</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {stats.map((stat) => (
            <div key={stat.label}>
              <p className="text-xs text-muted-foreground uppercase tracking-wide">{stat.label}</p>
              <p className="text-lg font-semibold mt-0.5">{stat.value}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
