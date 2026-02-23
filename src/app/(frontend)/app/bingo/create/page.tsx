'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { CategorySelect } from '@/components/CategorySelect'

export default function CreateBingoPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [selectedGridSize, setSelectedGridSize] = useState('3x3')
  const [availableMapCount, setAvailableMapCount] = useState<number | null>(null)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const formData = new FormData(e.currentTarget)

    try {
      const res = await fetch('/api/bingo/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: formData.get('title'),
          mode: formData.get('mode'),
          category: formData.get('category'),
          gridSize: formData.get('gridSize'),
          winCondition: formData.get('winCondition'),
          difficultyMin: Number(formData.get('difficultyMin')) || 0,
          difficultyMax: Number(formData.get('difficultyMax')) || 5,
          isPublic: formData.get('isPublic') === 'on',
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error)

      router.push(`/app/bingo/${data.game.id}`)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create game')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Create Bingo Game</h1>

      <Card>
        <CardContent className="p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="title">Game Title</Label>
              <Input id="title" name="title" required placeholder="My Bingo Game" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="mode">Mode</Label>
                <Select name="mode" defaultValue="solo">
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="solo">Solo</SelectItem>
                    <SelectItem value="team">Team</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="category">Category</Label>
                <CategorySelect
                  name="category"
                  defaultValue="novice"
                  onValueChange={(_, mapCount) => {
                    setAvailableMapCount(mapCount)
                    // Auto-downgrade grid size if current one needs more maps than available
                    if (mapCount !== null) {
                      const cells: Record<string, number> = { '3x3': 9, '5x5': 25, '7x7': 49 }
                      if (cells[selectedGridSize] > mapCount) {
                        const valid = ['7x7', '5x5', '3x3'].find((gs) => cells[gs] <= mapCount)
                        if (valid) setSelectedGridSize(valid)
                      }
                    }
                  }}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="gridSize">Grid Size</Label>
                <Select name="gridSize" value={selectedGridSize} onValueChange={setSelectedGridSize}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {([['3x3', 9], ['5x5', 25], ['7x7', 49]] as const).map(([size, cells]) => {
                      const disabled = availableMapCount !== null && availableMapCount < cells
                      return (
                        <SelectItem key={size} value={size} disabled={disabled}>
                          {size} ({cells} maps){disabled ? ` — have ${availableMapCount}` : ''}
                        </SelectItem>
                      )
                    })}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="winCondition">Win Condition</Label>
                <Select name="winCondition" defaultValue="line">
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="line">Line</SelectItem>
                    <SelectItem value="cross">Cross</SelectItem>
                    <SelectItem value="full_house">Full House</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="difficultyMin">Min Difficulty (stars)</Label>
                <Input id="difficultyMin" name="difficultyMin" type="number" min={0} max={5} defaultValue={0} />
              </div>
              <div>
                <Label htmlFor="difficultyMax">Max Difficulty (stars)</Label>
                <Input id="difficultyMax" name="difficultyMax" type="number" min={0} max={5} defaultValue={5} />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Switch id="isPublic" name="isPublic" />
              <Label htmlFor="isPublic" className="mb-0">Public Game (visible in lobby)</Label>
            </div>

            {error && <p className="text-sm text-red-500">{error}</p>}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Creating...' : 'Create Game'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
