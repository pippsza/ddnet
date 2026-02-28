'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/components/auth/AuthProvider'
import { useTranslations } from 'next-intl'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function CreateRacePage() {
  const router = useRouter()
  const { user } = useAuth()
  const t = useTranslations('race')
  const [error, setError] = useState('')
  const creatingRef = useRef(false)

  useEffect(() => {
    if (!user || creatingRef.current) return

    creatingRef.current = true

    fetch('/api/race/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: t('create.defaultTitle', { nick: user.ingameNick }),
        mode: 'solo',
        categoryMode: 'selected',
        category: 'novice',
        pathLength: 5,
        difficultyMin: 0,
        difficultyMax: 5,
        isPublic: false,
      }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.race?.id) {
          router.replace(`/app/race/${data.race.id}`)
        } else {
          setError(data.error || t('create.failed'))
          creatingRef.current = false
        }
      })
      .catch(() => {
        setError(t('create.failed'))
        creatingRef.current = false
      })
  }, [user, router])

  if (error) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-4 text-center">
        <p className="text-sm text-red-500">{error}</p>
        <Button variant="outline" onClick={() => router.back()}>
          {t('create.goBack')}
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
