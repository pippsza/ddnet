'use client'

import { useRef, useEffect } from 'react'
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

  const knownIdsRef = useRef<Set<string>>(new Set())
  const initializedRef = useRef(false)

  const notifications = data?.docs || []
  const unreadCount = notifications.filter((n) => !n.isRead).length

  useEffect(() => {
    if (!data?.docs) return

    if (!initializedRef.current) {
      // First load — seed known IDs without toasting the backlog
      knownIdsRef.current = new Set(data.docs.map((n) => n.id))
      initializedRef.current = true
      return
    }

    for (const n of data.docs) {
      if (!knownIdsRef.current.has(n.id) && !n.isRead) {
        toast(n.title, {
          description: n.message,
          action: n.actionUrl
            ? { label: 'View', onClick: () => { window.location.href = n.actionUrl! } }
            : undefined,
        })
      }
      knownIdsRef.current.add(n.id)
    }
  }, [data])

  return { notifications, unreadCount, mutate }
}
