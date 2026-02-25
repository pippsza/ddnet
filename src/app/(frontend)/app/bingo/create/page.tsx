'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/components/auth/AuthProvider'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function CreateBingoPage() {
  const router = useRouter()
  const { user } = useAuth()
  const [error, setError] = useState('')
  const creatingRef = useRef(false)

  useEffect(() => {
    if (!user || creatingRef.current) return

    creatingRef.current = true

    fetch('/api/bingo/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: `${user.ingameNick || user.username}'s Bingo`,
        mode: 'solo',
        category: 'novice',
        gridSize: '3x3',
        winCondition: 'line',
        difficultyMin: 0,
        difficultyMax: 5,
        isPublic: false,
      }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.game?.id) {
          router.replace(`/app/bingo/${data.game.id}`)
        } else {
          setError(data.error || 'Failed to create game')
          creatingRef.current = false
        }
      })
      .catch(() => {
        setError('Failed to create game')
        creatingRef.current = false
      })
  }, [user, router])

  if (error) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-4 text-center">
        <p className="text-sm text-red-500">{error}</p>
        <Button variant="outline" onClick={() => router.back()}>
          Go Back
        </Button>
      </div>
    )
  }

  return (
    <div className="h-full flex items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
    </div>
  )
}
