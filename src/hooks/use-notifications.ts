'use client'

import useSWR from 'swr'

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
 */
export function useNotifications() {
  const { data, mutate } = useSWR<{ docs: Notification[] }>(
    '/api/notifications',
    fetcher,
    { refreshInterval: 10000 },
  )

  const notifications = data?.docs || []
  const unreadCount = notifications.filter((n) => !n.isRead).length

  return { notifications, unreadCount, mutate }
}
