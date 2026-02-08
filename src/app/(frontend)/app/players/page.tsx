'use client'

import { useState, useEffect } from 'react'
import useSWR from 'swr'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { PlayerCard } from '@/components/players/PlayerCard'
import { PlayerGridSkeleton } from '@/components/ui/page-skeleton'

const fetcher = (url: string) => fetch(url).then((r) => r.json())

export default function PlayersPage() {
  const [query, setQuery] = useState('')
  const [searchUrl, setSearchUrl] = useState('/api/players/search')
  const { data, isLoading } = useSWR(searchUrl, fetcher)

  useEffect(() => {
    const timeout = setTimeout(() => {
      setSearchUrl(
        query.trim()
          ? `/api/players/search?q=${encodeURIComponent(query.trim())}`
          : '/api/players/search',
      )
    }, 300)
    return () => clearTimeout(timeout)
  }, [query])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setSearchUrl(
      query.trim()
        ? `/api/players/search?q=${encodeURIComponent(query.trim())}`
        : '/api/players/search',
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Players</h1>
      </div>

      <form onSubmit={handleSearch} className="flex gap-2">
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search players..."
          className="max-w-sm"
        />
        <Button type="submit" disabled={isLoading}>
          {isLoading ? 'Searching...' : 'Search'}
        </Button>
      </form>

      {isLoading && <PlayerGridSkeleton />}

      {!isLoading && data && (
        <div className="space-y-6">
          {/* Registered Players */}
          {data.registered?.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-lg font-semibold text-muted-foreground">
                {query ? 'Registered Players' : 'Community Members'}
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {data.registered.map((player: any) => (
                  <PlayerCard
                    key={player.name}
                    name={player.name}
                    points={player.points}
                    rank={player.rank}
                    isVerified={player.isVerified}
                    skin={player.skin}
                    variant="registered"
                  />
                ))}
              </div>
            </div>
          )}

          {/* DDNet Results */}
          {data.ddnet?.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-lg font-semibold text-muted-foreground">DDNet Players</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {data.ddnet.map((player: any) => (
                  <PlayerCard
                    key={player.name}
                    name={player.name}
                    points={player.points}
                    rank={player.rank}
                    variant="ddnet"
                  />
                ))}
              </div>
            </div>
          )}

          {data.registered?.length === 0 && data.ddnet?.length === 0 && query && (
            <Card>
              <CardContent className="p-8 text-center text-muted-foreground">
                No players found for &quot;{query}&quot;. Try a different name.
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  )
}
