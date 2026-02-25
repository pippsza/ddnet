'use client'

import { useState, useEffect } from 'react'
import useSWR from 'swr'
import { X, Megaphone } from 'lucide-react'

const fetcher = (url: string) => fetch(url).then((r) => r.json())

const STORAGE_KEY = 'dismissed-announcement'

export function AnnouncementBanner() {
  const { data } = useSWR('/api/globals/site-announcement', fetcher, {
    refreshInterval: 30_000,
  })

  const [dismissedId, setDismissedId] = useState<string | null>(null)
  const [visible, setVisible] = useState(false)

  // Read localStorage on mount
  useEffect(() => {
    setDismissedId(localStorage.getItem(STORAGE_KEY))
  }, [])

  // Determine visibility
  useEffect(() => {
    if (!data) return
    const shouldShow = data.enabled && data.message && data.announcementId !== dismissedId
    setVisible(shouldShow)
  }, [data, dismissedId])

  const handleDismiss = () => {
    if (data?.announcementId) {
      localStorage.setItem(STORAGE_KEY, data.announcementId)
      setDismissedId(data.announcementId)
    }
    setVisible(false)
  }

  if (!visible) return null

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-sm animate-in slide-in-from-bottom-4 fade-in duration-300">
      <div className="rounded-lg border bg-card p-4 shadow-lg">
        <div className="flex items-start gap-3">
          <div className="rounded-full bg-primary/10 p-2 shrink-0">
            <Megaphone className="h-4 w-4 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm whitespace-pre-line">{data?.message}</p>
          </div>
          <button
            onClick={handleDismiss}
            className="shrink-0 rounded-full p-1 hover:bg-muted transition-colors"
          >
            <X className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>
      </div>
    </div>
  )
}
