'use client'

import { use, useState } from 'react'
import useSWR from 'swr'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { StatusBadge, RoleBadge } from '@/components/ui/status-badge'
import { DetailPageSkeleton } from '@/components/ui/page-skeleton'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { TeeAvatarWithFallback, getDDNetSkinUrl } from '@/components/tee/TeeAvatar'
import { LexicalContent } from '@/components/ui/LexicalContent'
import { ChatBubble, ChatMessages, ChatInput } from '@/components/chat'
import { MessageImages } from '@/components/chat/MessageImages'
import { useTypingIndicator } from '@/hooks/use-typing-indicator'
import { extractText } from '@/lib/lexical-utils'
import { usePermissions } from '@/hooks/use-permissions'
import { ArrowLeft } from 'lucide-react'

const fetcher = (url: string) => fetch(url).then((r) => r.json())

const TICKET_STATUSES = [
  { value: 'open', label: 'Open' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'waiting_for_user', label: 'Awaiting Reply' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'closed', label: 'Closed' },
  { value: 'rejected', label: 'Rejected' },
]

export default function SupportTicketPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const { data, isLoading, mutate } = useSWR(`/api/support/${id}?depth=1`, fetcher)
  const { data: meData } = useSWR('/api/users/me', fetcher)
  const [sending, setSending] = useState(false)
  const [updatingStatus, setUpdatingStatus] = useState(false)

  const ticket = data?.id ? data : null

  const { hasPermission: hasPerm } = usePermissions()
  const isStaff = hasPerm('support', 'reply')

  // Typing indicator
  const { typingUsers, notifyTyping } = useTypingIndicator({
    scope: 'support',
    scopeId: id,
  })
  const typingText =
    typingUsers.length > 0 ? `${typingUsers.map((u) => u.userName).join(', ')} typing...` : null

  if (isLoading) return <DetailPageSkeleton />

  if (!ticket) {
    return (
      <div className="space-y-4">
        <Link
          href="/support"
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Support
        </Link>
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            Ticket not found.
          </CardContent>
        </Card>
      </div>
    )
  }

  const handleSendMessage = async (text: string | any, images?: string[]) => {
    const message = typeof text === 'string' ? text.trim() : ''
    const hasImages = images && images.length > 0
    if ((!message && !hasImages) || sending) return
    setSending(true)

    const optimisticResponse = {
      message,
      author: meData?.user || 'You',
      isStaffResponse: isStaff,
      timestamp: new Date().toISOString(),
      ...(hasImages && { images: images.map((imgId) => ({ image: { id: imgId, url: '' } })) }),
    }

    await mutate(
      async (current: any) => {
        try {
          const res = await fetch(`/api/support/${id}/reply`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message, ...(hasImages && { images }) }),
          })
          const result = await res.json()
          return result.ticket || current
        } catch {
          return current
        }
      },
      {
        optimisticData: ticket
          ? { ...ticket, responses: [...(ticket.responses || []), optimisticResponse] }
          : undefined,
        rollbackOnError: true,
      },
    )
    setSending(false)
  }

  const handleStatusChange = async (newStatus: string) => {
    setUpdatingStatus(true)
    await mutate(
      async (current: any) => {
        try {
          await fetch(`/api/support/${id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: newStatus }),
          })
          return current ? { ...current, status: newStatus } : current
        } catch {
          return current
        }
      },
      {
        optimisticData: ticket ? { ...ticket, status: newStatus } : undefined,
        rollbackOnError: true,
      },
    )
    setUpdatingStatus(false)
  }

  const isClosed = ticket.status === 'resolved' || ticket.status === 'closed'

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)]">
      {/* Header area */}
      <div className="shrink-0 space-y-4 pb-4">
        <Link
          href="/support"
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Support
        </Link>

        {/* Ticket Header */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>{ticket.subject}</CardTitle>
              <div className="flex items-center gap-2">
                <StatusBadge status={ticket.priority} />
                {isStaff ? (
                  <Select
                    value={ticket.status}
                    onValueChange={handleStatusChange}
                    disabled={updatingStatus}
                  >
                    <SelectTrigger className="w-[160px] h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TICKET_STATUSES.map((s) => (
                        <SelectItem key={s.value} value={s.value}>
                          {s.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <StatusBadge status={ticket.status} />
                )}
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              Created {new Date(ticket.createdAt).toLocaleString()}
            </p>
          </CardHeader>
          <CardContent>
            <p className="text-sm whitespace-pre-wrap">{extractText(ticket.description)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Messages — scrollable */}
      <ChatMessages scrollKey={ticket.responses?.length} typingText={typingText}>
        {(ticket.responses || []).map((response: any, i: number) => {
          const responseAuthorId =
            typeof response.author === 'object' ? response.author?.id : response.author
          const isOwn = responseAuthorId === meData?.user?.id
          const authorObj = typeof response.author === 'object' ? response.author : null
          const authorName = authorObj?.ingameNick || (isOwn ? 'You' : 'Support')
          const skinName = authorObj?.ingameStats?.skin?.name
          const authorRole = (authorObj as any)?.primaryRole || authorObj?.roles

          const avatar = (
            <div className="shrink-0">
              <TeeAvatarWithFallback
                skinUrl={skinName ? getDDNetSkinUrl(skinName) : undefined}
                bodyColor={authorObj?.ingameStats?.skin?.color_body}
                feetColor={authorObj?.ingameStats?.skin?.color_feet}
                useCustomColors={
                  !!(
                    authorObj?.ingameStats?.skin?.color_body ||
                    authorObj?.ingameStats?.skin?.color_feet
                  )
                }
                size="xs"
              />
            </div>
          )

          const header = (
            <>
              <span className="text-xs font-medium opacity-70">{authorName}</span>
              {authorRole && authorRole !== 'player' ? (
                <RoleBadge role={authorRole} className="text-[10px] px-1 py-0" />
              ) : (
                <span className="text-[10px] opacity-50 bg-muted/50 px-1.5 py-0 rounded">
                  Member
                </span>
              )}
              <span className="text-xs opacity-50">
                {new Date(response.timestamp).toLocaleString()}
              </span>
            </>
          )

          return (
            <ChatBubble key={i} isOwn={isOwn} avatar={avatar} header={header}>
              <LexicalContent content={response.message} />
              <MessageImages images={response.images} />
            </ChatBubble>
          )
        })}
      </ChatMessages>

      {/* Reply Form */}
      <ChatInput
        onSend={handleSendMessage}
        placeholder="Type your message... "
        sending={sending}
        disabled={isClosed}
        disabledMessage={`This ticket is ${ticket.status}.`}
        onTyping={notifyTyping}
      />
    </div>
  )
}
