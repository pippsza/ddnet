'use client'

import { useEffect } from 'react'
import useSWR from 'swr'
import { toast } from 'sonner'

const fetcher = (url: string) => fetch(url).then((r) => r.json())

export interface Notification {
  id: string
  type: string
  title: string
  message: string
  isRead: boolean
  actionUrl?: string
  createdAt: string
}

// Global singleton to prevent duplicate toasts when multiple components use useNotifications()
const globalKnownIds = new Set<string>()
let globalInitialized = false

/**
 * Shared hook for notification data. SWR deduplicates requests,
 * so multiple components using this hook result in a single fetch.
 * Shows toast popups for new notifications as they arrive.
 */
export function useNotifications() {
  const { data, mutate } = useSWR<{ docs: Notification[] }>(
    '/api/notifications',
    fetcher,
    { refreshInterval: 10000 },
  )

  const notifications = data?.docs || []
  const unreadCount = notifications.filter((n) => !n.isRead).length

  useEffect(() => {
    if (!data?.docs) return

    if (!globalInitialized) {
      // First load — seed known IDs without toasting the backlog
      for (const n of data.docs) {
        globalKnownIds.add(n.id)
      }
      globalInitialized = true
      return
    }

    for (const n of data.docs) {
      if (!globalKnownIds.has(n.id) && !n.isRead) {
        globalKnownIds.add(n.id)
        toast(n.title, {
          description: n.message,
          action: n.actionUrl
            ? { label: 'View', onClick: () => { window.location.href = n.actionUrl! } }
            : undefined,
        })
      }
    }
  }, [data])

  return { notifications, unreadCount, mutate }
}
