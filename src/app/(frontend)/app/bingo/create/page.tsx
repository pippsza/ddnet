'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'

const CATEGORIES = [
  'novice', 'moderate', 'brutal', 'insane', 'dummy',
  'ddmax', 'oldschool', 'solo_maps', 'race',
]

export default function CreateBingoPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

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
                <Select name="category" defaultValue="novice">
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((cat) => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="gridSize">Grid Size</Label>
                <Select name="gridSize" defaultValue="3x3">
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="3x3">3x3 (9 maps)</SelectItem>
                    <SelectItem value="5x5">5x5 (25 maps)</SelectItem>
                    <SelectItem value="7x7">7x7 (49 maps)</SelectItem>
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
              <Label htmlFor="isPublic">Public Game (visible in lobby)</Label>
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
