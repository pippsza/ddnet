'use client'

import { useState } from 'react'
import useSWR from 'swr'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import type { BotSettingsData } from '@/hooks/use-bot-settings'

const fetcher = (url: string) => fetch(url, { credentials: 'include' }).then((r) => r.json())

const BOT_TOGGLES = [
  {
    field: 'verificationBotEnabled' as keyof BotSettingsData,
    label: 'Verification Bot',
    description: 'Identity verification and nickname claiming',
  },
  {
    field: 'raceBotEnabled' as keyof BotSettingsData,
    label: 'Race Bot',
    description: 'In-game race announcements (scoring still works without bot)',
  },
  {
    field: 'ingameChatBotEnabled' as keyof BotSettingsData,
    label: 'In-Game Chat Bot',
    description: 'Web-to-game message relay',
  },
]

export default function AdminBotsPage() {
  const { data, error, mutate } = useSWR('/api/admin/bots', fetcher, {
    refreshInterval: 10000,
  })
  const { data: botSettings, mutate: mutateSettings } = useSWR<BotSettingsData>(
    '/api/bot-settings',
    fetcher,
    { revalidateOnFocus: false },
  )
  const [togglingBot, setTogglingBot] = useState<string | null>(null)

  const handleToggle = async (field: string, newValue: boolean) => {
    setTogglingBot(field)
    try {
      await fetch('/api/globals/bot-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ [field]: newValue }),
      })
      mutateSettings()
    } catch {
      // ignore
    } finally {
      setTogglingBot(null)
    }
  }

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

      <Card>
        <CardContent className="p-6 space-y-4">
          <div>
            <h2 className="text-lg font-semibold">Bot Toggles</h2>
            <p className="text-sm text-muted-foreground">
              Enable or disable specific bot types. Disabled bots will show maintenance messages to users.
            </p>
          </div>
          {BOT_TOGGLES.map(({ field, label, description }) => (
            <div key={field} className="flex items-center justify-between">
              <div>
                <Label className="text-sm font-medium">{label}</Label>
                <p className="text-xs text-muted-foreground">{description}</p>
              </div>
              <Switch
                checked={botSettings?.[field] ?? true}
                onCheckedChange={(v) => handleToggle(field, v)}
                disabled={togglingBot === field}
              />
            </div>
          ))}
        </CardContent>
      </Card>

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
