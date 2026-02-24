'use client'

import { useState, useCallback } from 'react'
import useSWR from 'swr'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { DebouncedInput } from '@/components/ui/debounced-input'
import { TeeAvatarWithFallback, getDDNetSkinUrl } from '@/components/tee/TeeAvatar'
import { RoleBadge } from '@/components/ui/status-badge'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { Send, Users, UserCheck, Search, X, Loader2, CheckCircle } from 'lucide-react'

const fetcher = (url: string) => fetch(url).then((r) => r.json())

interface SelectedUser {
  id: string
  name: string
  skin?: string
  roles?: string
}

export default function AdminNotificationsPage() {
  const [target, setTarget] = useState<'all' | 'selected'>('all')
  const [title, setTitle] = useState('')
  const [message, setMessage] = useState('')
  const [actionUrl, setActionUrl] = useState('')
  const [sending, setSending] = useState(false)
  const [result, setResult] = useState<{ sent: number; total: number } | null>(null)

  // User search & selection
  const [selectedUsers, setSelectedUsers] = useState<SelectedUser[]>([])
  const [searchQuery, setSearchQuery] = useState('')

  const { data: searchData } = useSWR(
    target === 'selected' && searchQuery
      ? `/api/players/search?q=${encodeURIComponent(searchQuery)}&limit=10`
      : null,
    fetcher,
  )

  const searchResults: any[] = searchData?.registered || []
  const selectedIds = new Set(selectedUsers.map((u) => u.id))

  const addUser = useCallback((player: any) => {
    setSelectedUsers((prev) => {
      if (prev.some((u) => u.id === player.id)) return prev
      return [
        ...prev,
        {
          id: player.id,
          name: player.name,
          skin: player.skin?.name,
          roles: player.roles,
        },
      ]
    })
  }, [])

  const removeUser = useCallback((id: string) => {
    setSelectedUsers((prev) => prev.filter((u) => u.id !== id))
  }, [])

  const handleSend = async () => {
    if (!title.trim() || !message.trim()) {
      toast.error('Fill in title and message')
      return
    }
    if (target === 'selected' && selectedUsers.length === 0) {
      toast.error('Select at least one user')
      return
    }

    setSending(true)
    setResult(null)
    try {
      const res = await fetch('/api/admin/notifications/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          message: message.trim(),
          actionUrl: actionUrl.trim() || undefined,
          target,
          userIds: target === 'selected' ? selectedUsers.map((u) => u.id) : undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setResult(data)
      toast.success(`Sent to ${data.sent} users`)
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to send')
    } finally {
      setSending(false)
    }
  }

  const handleReset = () => {
    setTitle('')
    setMessage('')
    setActionUrl('')
    setSelectedUsers([])
    setResult(null)
  }

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold">Send Notification</h1>

      {/* Success result */}
      {result && (
        <Card className="border-green-500/30">
          <CardContent className="p-6 flex items-center gap-4">
            <CheckCircle className="h-8 w-8 text-green-500 shrink-0" />
            <div>
              <p className="font-semibold">
                Sent {result.sent} / {result.total} notifications
              </p>
              <p className="text-sm text-muted-foreground">
                Push notifications will be delivered to users with push enabled.
              </p>
            </div>
            <Button variant="outline" size="sm" className="ml-auto" onClick={handleReset}>
              Send another
            </Button>
          </CardContent>
        </Card>
      )}

      {!result && (
        <div className="space-y-6">
          {/* Target selector */}
          <div className="flex gap-2">
            <Button
              variant={target === 'all' ? 'default' : 'outline'}
              onClick={() => setTarget('all')}
              className="flex-1"
            >
              <Users className="h-4 w-4 mr-2" />
              All Users
            </Button>
            <Button
              variant={target === 'selected' ? 'default' : 'outline'}
              onClick={() => setTarget('selected')}
              className="flex-1"
            >
              <UserCheck className="h-4 w-4 mr-2" />
              Selected Users
            </Button>
          </div>

          {/* User picker */}
          {target === 'selected' && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Recipients</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* Selected users */}
                {selectedUsers.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {selectedUsers.map((user) => (
                      <Badge
                        key={user.id}
                        variant="secondary"
                        className="flex items-center gap-1.5 pr-1"
                      >
                        <TeeAvatarWithFallback
                          skinUrl={user.skin ? getDDNetSkinUrl(user.skin) : undefined}
                          size="xs"
                        />
                        <span>{user.name}</span>
                        <button
                          onClick={() => removeUser(user.id)}
                          className="ml-0.5 rounded-full p-0.5 hover:bg-muted"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}

                {/* Search */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <DebouncedInput
                    onDebouncedChange={setSearchQuery}
                    placeholder="Search players..."
                    className="pl-10"
                    debounce={300}
                  />
                </div>

                {/* Search results */}
                {searchQuery && searchResults.length > 0 && (
                  <div className="border rounded-lg divide-y max-h-48 overflow-y-auto">
                    {searchResults
                      .filter((p: any) => !selectedIds.has(p.id))
                      .map((player: any) => (
                        <button
                          key={player.id}
                          onClick={() => addUser(player)}
                          className="flex items-center gap-3 w-full px-3 py-2 text-left hover:bg-muted/50 transition-colors"
                        >
                          <TeeAvatarWithFallback
                            skinUrl={
                              player.skin?.name ? getDDNetSkinUrl(player.skin.name) : undefined
                            }
                            size="xs"
                          />
                          <span className="text-sm font-medium">{player.name}</span>
                          <RoleBadge role={(player as any).primaryRole || player.roles} className="text-[10px] px-1.5 py-0" />
                        </button>
                      ))}
                  </div>
                )}

                {searchQuery && searchResults.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-2">No players found</p>
                )}
              </CardContent>
            </Card>
          )}

          {/* Notification form */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Notification Content</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Title</Label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Notification title"
                />
              </div>
              <div>
                <Label>Message</Label>
                <Textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Notification message..."
                  rows={3}
                  className="resize-none"
                />
              </div>
              <div>
                <Label>
                  Action URL <span className="text-muted-foreground font-normal">(optional)</span>
                </Label>
                <Input
                  value={actionUrl}
                  onChange={(e) => setActionUrl(e.target.value)}
                  placeholder="/app/articles/my-article"
                />
              </div>
            </CardContent>
          </Card>

          {/* Preview */}
          <Card className="border-dashed">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs text-muted-foreground">Preview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-start gap-3">
                <div className="rounded-full bg-blue-500/10 p-2 shrink-0">
                  <Send className="h-4 w-4 text-blue-500" />
                </div>
                <div className="min-w-0">
                  <p className={cn('text-sm font-semibold', !title && 'text-muted-foreground')}>
                    {title || 'Title...'}
                  </p>
                  <p className={cn('text-sm', !message && 'text-muted-foreground')}>
                    {message || 'Message...'}
                  </p>
                  {actionUrl && <p className="text-xs text-primary mt-1">{actionUrl}</p>}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Send button */}
          <Button
            onClick={handleSend}
            disabled={
              sending ||
              !title.trim() ||
              !message.trim() ||
              (target === 'selected' && selectedUsers.length === 0)
            }
            className="w-full"
            size="lg"
          >
            {sending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                Send to{' '}
                {target === 'all'
                  ? 'all users'
                  : `${selectedUsers.length} user${selectedUsers.length !== 1 ? 's' : ''}`}
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  )
}
