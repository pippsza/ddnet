'use client'

import { Suspense } from 'react'
import useSWR from 'swr'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { CardListSkeleton } from '@/components/ui/page-skeleton'
import { PaginationControls } from '@/components/ui/pagination-controls'
import { usePagination } from '@/hooks/use-pagination'
import { cn } from '@/lib/utils'
import {
  Bell,
  UserPlus,
  UserCheck,
  Gamepad2,
  Trophy,
  Star,
  Info,
  CheckCheck,
} from 'lucide-react'

const fetcher = (url: string) => fetch(url).then((r) => r.json())

const TYPE_CONFIG: Record<string, { icon: any; color: string; label: string }> = {
  game_invite: { icon: Gamepad2, color: 'text-blue-500 bg-blue-500/10', label: 'Game Invite' },
  friend_request: { icon: UserPlus, color: 'text-purple-500 bg-purple-500/10', label: 'Friend Request' },
  friend_accepted: { icon: UserCheck, color: 'text-green-500 bg-green-500/10', label: 'Friend Accepted' },
  game_started: { icon: Gamepad2, color: 'text-cyan-500 bg-cyan-500/10', label: 'Game Started' },
  game_ended: { icon: Trophy, color: 'text-amber-500 bg-amber-500/10', label: 'Game Ended' },
  round_won: { icon: Trophy, color: 'text-green-500 bg-green-500/10', label: 'Round Won' },
  achievement: { icon: Star, color: 'text-amber-500 bg-amber-500/10', label: 'Achievement' },
  system: { icon: Info, color: 'text-gray-500 bg-gray-500/10', label: 'System' },
  info: { icon: Info, color: 'text-blue-500 bg-blue-500/10', label: 'Info' },
}

function NotificationsContent() {
  const { page, setPage, buildUrl } = usePagination({ defaultLimit: 20 })

  const { data, isLoading, mutate } = useSWR(
    buildUrl('/api/notifications?sort=-createdAt&depth=1'),
    fetcher,
    { refreshInterval: 10000 },
  )

  const notifications = data?.docs || []
  const totalPages = data?.totalPages || 1
  const totalDocs = data?.totalDocs || 0
  const unreadCount = notifications.filter((n: any) => !n.isRead).length

  const markAsRead = async (id: string) => {
    await fetch(`/api/notifications/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isRead: true }),
    })
    mutate()
  }

  const markAllAsRead = async () => {
    const unread = notifications.filter((n: any) => !n.isRead)
    await Promise.all(
      unread.map((n: any) =>
        fetch(`/api/notifications/${n.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ isRead: true }),
        }),
      ),
    )
    mutate()
  }

  if (isLoading) return <CardListSkeleton />

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold">Notifications</h1>
          {unreadCount > 0 && (
            <Badge className="bg-blue-500 text-white">{unreadCount} new</Badge>
          )}
        </div>
        {unreadCount > 0 && (
          <Button variant="outline" size="sm" onClick={markAllAsRead}>
            <CheckCheck className="h-4 w-4 mr-2" />
            Mark all read
          </Button>
        )}
      </div>

      {notifications.length > 0 ? (
        <div className="space-y-2">
          {notifications.map((notif: any) => {
            const config = TYPE_CONFIG[notif.type] || TYPE_CONFIG.system
            const Icon = config.icon

            const content = (
              <Card
                className={cn(
                  'transition-all',
                  !notif.isRead && 'border-l-2 border-l-blue-500 bg-blue-500/5',
                  notif.actionUrl && 'hover:shadow-md hover:border-primary/30 cursor-pointer',
                )}
              >
                <CardContent className="flex items-start gap-4 p-4">
                  <div className={cn('p-2 rounded-lg shrink-0', config.color)}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold">{notif.title}</span>
                      {!notif.isRead && (
                        <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0" />
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mt-0.5">{notif.message}</p>
                    <div className="flex items-center gap-2 mt-1.5">
                      <span className="text-[10px] text-muted-foreground">
                        {formatTimeAgo(notif.createdAt)}
                      </span>
                      <Badge variant="outline" className="text-[10px]">
                        {config.label}
                      </Badge>
                    </div>
                  </div>
                  {!notif.isRead && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="shrink-0 text-xs"
                      onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        markAsRead(notif.id)
                      }}
                    >
                      Mark read
                    </Button>
                  )}
                </CardContent>
              </Card>
            )

            if (notif.actionUrl) {
              return (
                <Link
                  key={notif.id}
                  href={notif.actionUrl}
                  className="block"
                  onClick={() => {
                    if (!notif.isRead) markAsRead(notif.id)
                  }}
                >
                  {content}
                </Link>
              )
            }

            return <div key={notif.id}>{content}</div>
          })}
        </div>
      ) : (
        <Card>
          <CardContent className="p-12 text-center text-muted-foreground">
            <Bell className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p>No notifications yet.</p>
            <p className="text-xs mt-1">You&apos;ll be notified about friend requests, game invites, and more.</p>
          </CardContent>
        </Card>
      )}

      <PaginationControls
        page={page}
        totalPages={totalPages}
        totalDocs={totalDocs}
        limit={20}
        onPageChange={setPage}
      />
    </div>
  )
}

function formatTimeAgo(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMin = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMin < 1) return 'Just now'
  if (diffMin < 60) return `${diffMin}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`
  return date.toLocaleDateString()
}

export default function NotificationsPage() {
  return (
    <Suspense fallback={<CardListSkeleton />}>
      <NotificationsContent />
    </Suspense>
  )
}
