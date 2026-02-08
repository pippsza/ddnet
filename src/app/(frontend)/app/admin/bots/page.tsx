'use client'

import useSWR from 'swr'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

const fetcher = (url: string) => fetch(url).then((r) => r.json())

export default function AdminBotsPage() {
  const { data, error, mutate } = useSWR('/api/admin/bots', fetcher, {
    refreshInterval: 10000,
  })

  const handleStop = async (botId: string) => {
    try {
      await fetch(`/api/admin/bots/${botId}`, { method: 'DELETE' })
      mutate()
    } catch {
      // ignore
    }
  }

  if (error) return <div className="p-8 text-center text-red-500">Access denied or error loading</div>

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Bot Management</h1>

      <div className="grid gap-4">
        {data?.bots?.map((bot: any) => (
          <Card key={bot.id}>
            <CardContent className="flex items-center justify-between p-4">
              <div>
                <h3 className="font-semibold font-mono text-sm">{bot.containerId?.slice(0, 12)}</h3>
                <p className="text-sm text-muted-foreground">
                  Mode: {bot.mode} | Type: {bot.gameType || 'N/A'}
                </p>
                <p className="text-xs text-muted-foreground">
                  Started: {bot.startedAt ? new Date(bot.startedAt).toLocaleString() : 'Unknown'}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Badge variant={bot.status === 'running' ? 'default' : 'secondary'}>
                  {bot.status}
                </Badge>
                {bot.status === 'running' && (
                  <Button variant="destructive" size="sm" onClick={() => handleStop(bot.id)}>
                    Stop
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
        {(!data?.bots || data.bots.length === 0) && (
          <Card>
            <CardContent className="p-8 text-center text-muted-foreground">
              No active bots.
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
