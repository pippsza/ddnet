'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Search, X, UserPlus } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { TeeAvatarWithFallback } from '@/components/tee/TeeAvatar'
import { cn } from '@/lib/utils'

interface PlayerResult {
  id: string
  name: string
  points: number
  skin?: { name: string; colorBody: number; colorFeet: number }
  isRegistered: boolean
}

interface SelectedPlayer {
  id: string
  name: string
  skin?: { name: string; colorBody: number; colorFeet: number }
}

interface FriendInviteSearchProps {
  value: SelectedPlayer | null
  onChange: (player: SelectedPlayer | null) => void
}

export function FriendInviteSearch({ value, onChange }: FriendInviteSearchProps) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<PlayerResult[]>([])
  const [loading, setLoading] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null)

  const search = useCallback(async (q: string) => {
    if (q.length < 2) {
      setResults([])
      return
    }
    setLoading(true)
    try {
      const res = await fetch(`/api/players/search?q=${encodeURIComponent(q)}&limit=6`)
      const data = await res.json()
      // Only show registered users (they have accounts to receive notifications)
      setResults(
        (data.registered || []).map((u: any) => ({
          id: u.id,
          name: u.name,
          points: u.points || 0,
          skin: u.skin,
          isRegistered: true,
        })),
      )
    } catch {
      setResults([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => search(query), 300)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [query, search])

  // Close dropdown on click outside
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  if (value) {
    return (
      <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/30 px-3 py-2">
        <UserPlus className="h-4 w-4 text-muted-foreground shrink-0" />
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <TeeAvatarWithFallback
            skinUrl={
              value.skin?.name
                ? `https://skins.ddnet.org/skin/community/${value.skin.name}.png`
                : undefined
            }
            bodyColor={value.skin?.colorBody}
            feetColor={value.skin?.colorFeet}
            size="xs"
          />
          <span className="text-sm font-medium truncate">{value.name}</span>
        </div>
        <button
          type="button"
          onClick={() => onChange(null)}
          className="shrink-0 rounded-full p-1 hover:bg-muted transition-colors"
        >
          <X className="h-3.5 w-3.5 text-muted-foreground" />
        </button>
      </div>
    )
  }

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setIsOpen(true)
          }}
          onFocus={() => setIsOpen(true)}
          placeholder="Search player to invite..."
          className="pl-9"
        />
      </div>

      {isOpen && (query.length >= 2) && (
        <div className="absolute z-50 top-full mt-1 w-full rounded-lg border bg-popover shadow-lg max-h-60 overflow-y-auto">
          {loading && (
            <div className="px-3 py-2 text-sm text-muted-foreground">Searching...</div>
          )}
          {!loading && results.length === 0 && (
            <div className="px-3 py-2 text-sm text-muted-foreground">No registered players found</div>
          )}
          {!loading &&
            results.map((player) => (
              <button
                key={player.id}
                type="button"
                className="flex items-center gap-3 w-full px-3 py-2 text-left hover:bg-muted/50 transition-colors"
                onClick={() => {
                  onChange({ id: player.id, name: player.name, skin: player.skin })
                  setQuery('')
                  setIsOpen(false)
                }}
              >
                <TeeAvatarWithFallback
                  skinUrl={
                    player.skin?.name
                      ? `https://skins.ddnet.org/skin/community/${player.skin.name}.png`
                      : undefined
                  }
                  bodyColor={player.skin?.colorBody}
                  feetColor={player.skin?.colorFeet}
                  size="xs"
                />
                <div className="flex flex-col min-w-0">
                  <span className="text-sm font-medium truncate">{player.name}</span>
                  <span className="text-xs text-muted-foreground">{player.points} points</span>
                </div>
              </button>
            ))}
        </div>
      )}
    </div>
  )
}
