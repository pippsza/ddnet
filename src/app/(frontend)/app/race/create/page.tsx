'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { CategorySelect } from '@/components/CategorySelect'

export default function CreateRacePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [totalRounds, setTotalRounds] = useState(5)
  const [availableMapCount, setAvailableMapCount] = useState<number | null>(null)

  const maxRounds = availableMapCount ?? 20

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const formData = new FormData(e.currentTarget)

    try {
      const res = await fetch('/api/race/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: formData.get('title'),
          category: formData.get('category'),
          totalRounds: Number(formData.get('totalRounds')) || 5,
          server: {
            ip: formData.get('serverIp'),
            port: Number(formData.get('serverPort')) || 8303,
            name: formData.get('serverName') || undefined,
          },
          isPublic: formData.get('isPublic') === 'on',
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error)

      router.push(`/app/race/${data.race.id}`)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create race')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Create Race</h1>

      <Card>
        <CardContent className="p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="title">Race Title</Label>
              <Input id="title" name="title" required placeholder="My Race" />
            </div>

            <div>
              <Label htmlFor="category">Category</Label>
              <CategorySelect
                name="category"
                defaultValue="novice"
                onValueChange={(_, mapCount) => {
                  setAvailableMapCount(mapCount)
                  const newMax = mapCount ?? 20
                  if (totalRounds > newMax) setTotalRounds(newMax)
                }}
              />
            </div>

            <div>
              <Label htmlFor="totalRounds">Total Rounds</Label>
              <Input
                id="totalRounds"
                name="totalRounds"
                type="number"
                min={1}
                max={maxRounds}
                value={totalRounds}
                onChange={(e) => {
                  const val = Math.max(1, Math.min(maxRounds, Number(e.target.value) || 1))
                  setTotalRounds(val)
                }}
              />
              {availableMapCount !== null && (
                <p className="text-xs text-muted-foreground mt-1">
                  Max {maxRounds} rounds ({availableMapCount} maps available)
                </p>
              )}
            </div>

            <div className="space-y-2">
              <h3 className="text-sm font-medium">Server</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="serverIp">Server IP</Label>
                  <Input id="serverIp" name="serverIp" required placeholder="127.0.0.1" />
                </div>
                <div>
                  <Label htmlFor="serverPort">Port</Label>
                  <Input
                    id="serverPort"
                    name="serverPort"
                    type="number"
                    defaultValue={8303}
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="serverName">Server Name (optional)</Label>
                <Input id="serverName" name="serverName" placeholder="My DDNet Server" />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Switch id="isPublic" name="isPublic" />
              <Label htmlFor="isPublic" className="mb-0">Public Race (visible in lobby)</Label>
            </div>

            {error && <p className="text-sm text-red-500">{error}</p>}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Creating...' : 'Create Race'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
