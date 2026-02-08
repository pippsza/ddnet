'use client'

import { useState } from 'react'
import useSWR from 'swr'
import { Bell } from 'lucide-react'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

const fetcher = (url: string) => fetch(url).then((r) => r.json())

interface Notification {
  id: string
  type: string
  title: string
  message: string
  isRead: boolean
  actionUrl?: string
  createdAt: string
}

export function NotificationBell() {
  const [open, setOpen] = useState(false)
  const { data, mutate } = useSWR<{ docs: Notification[] }>('/api/notifications', fetcher, {
    refreshInterval: 10000,
  })

  const unreadCount = data?.docs?.filter((n) => !n.isRead).length || 0

  const markAsRead = async (id: string) => {
    await fetch(`/api/notifications/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isRead: true }),
    })
    mutate()
  }

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.isRead) {
      markAsRead(notification.id)
    }
    if (notification.actionUrl) {
      window.location.href = notification.actionUrl
    }
    setOpen(false)
  }

  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMins / 60)
    const diffDays = Math.floor(diffHours / 24)

    if (diffMins < 1) return 'just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    return `${diffDays}d ago`
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge
              className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-xs"
              variant="destructive"
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="p-3 border-b">
          <h4 className="font-semibold text-sm">Notifications</h4>
        </div>
        <div className="max-h-96 overflow-y-auto">
          {data?.docs?.map((notification) => (
            <button
              key={notification.id}
              onClick={() => handleNotificationClick(notification)}
              className={`w-full text-left p-3 border-b last:border-0 hover:bg-muted/50 transition-colors ${
                !notification.isRead ? 'bg-muted/30' : ''
              }`}
            >
              <div className="flex items-start gap-2">
                {!notification.isRead && (
                  <div className="w-2 h-2 rounded-full bg-blue-500 mt-1.5 shrink-0" />
                )}
                <div className={!notification.isRead ? '' : 'ml-4'}>
                  <p className="text-sm font-medium">{notification.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{notification.message}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {formatTime(notification.createdAt)}
                  </p>
                </div>
              </div>
            </button>
          ))}
          {(!data?.docs || data.docs.length === 0) && (
            <div className="p-6 text-center text-muted-foreground text-sm">
              No notifications
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}
