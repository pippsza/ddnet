'use client'

import { use, useState } from 'react'
import useSWR from 'swr'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { StatusBadge, RoleBadge } from '@/components/ui/status-badge'
import { DetailPageSkeleton } from '@/components/ui/page-skeleton'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import { TeeAvatarWithFallback, getDDNetSkinUrl } from '@/components/tee/TeeAvatar'
import { LexicalContent } from '@/components/ui/LexicalContent'
import { ChatBubble, ChatMessages, ChatInput } from '@/components/chat'
import { MessageImages } from '@/components/chat/MessageImages'
import { useTypingIndicator } from '@/hooks/use-typing-indicator'
import { extractText } from '@/lib/lexical-utils'
import { usePermissions } from '@/hooks/use-permissions'
import { ArrowLeft, Info, FileIcon } from 'lucide-react'

const fetcher = (url: string) => fetch(url).then((r) => r.json())

const TICKET_STATUSES = [
  { value: 'open', label: 'Open' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'waiting_for_user', label: 'Awaiting Reply' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'closed', label: 'Closed' },
  { value: 'rejected', label: 'Rejected' },
]

const CATEGORIES: Record<string, string> = {
  bug_report: 'Bug Report',
  account_issues: 'Account Issues',
  name_change: 'Name Change',
  nickname_conflict: 'Nickname Conflict',
  verification_request: 'Verification Request',
  game_statistics: 'Game Statistics',
  other: 'Other',
}

export default function SupportTicketPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const { data, isLoading, mutate } = useSWR(`/api/support/${id}?depth=1`, fetcher)
  const { data: meData } = useSWR('/api/users/me', fetcher)
  const [sending, setSending] = useState(false)
  const [updatingStatus, setUpdatingStatus] = useState(false)

  const ticket = data?.id ? data : null

  const { hasPermission: hasPerm } = usePermissions()
  const isStaff = hasPerm('support', 'reply')

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

  const isAnonymous = !meData?.user
  const isClosed = ticket.status === 'resolved' || ticket.status === 'closed'

  const messages = (
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
            <RoleBadge role={authorRole || 'player'} className="text-[10px] px-1 py-0" />
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
  )

  const chatInput = isAnonymous ? (
    <div className="shrink-0 border-t p-3 text-center text-sm text-muted-foreground">
      <Link href="/login" className="text-primary hover:underline">Log in</Link> to reply to this ticket.
    </div>
  ) : (
    <ChatInput
      onSend={handleSendMessage}
      placeholder="Type your message... "
      sending={sending}
      disabled={isClosed}
      disabledMessage={`This ticket is ${ticket.status}.`}
      onTyping={notifyTyping}
    />
  )

  return (
    <div className="flex flex-col md:flex-row h-[calc(100vh-8rem)]">
      {/* Main chat area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <div className="shrink-0 flex items-center gap-3 pb-3">
          <Link
            href="/support"
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors shrink-0"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Back</span>
          </Link>
          <h1 className="text-sm font-semibold truncate flex-1">{ticket.subject}</h1>
          <div className="flex items-center gap-2 shrink-0">
            <StatusBadge status={ticket.status} />
            {/* Mobile: info button → Sheet */}
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="sm" className="h-7 w-7 p-0 md:hidden">
                  <Info className="h-4 w-4" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-80 overflow-y-auto">
                <SheetHeader>
                  <SheetTitle>Ticket Info</SheetTitle>
                </SheetHeader>
                <TicketInfoPanel
                  ticket={ticket}
                  isStaff={isStaff}
                  onStatusChange={handleStatusChange}
                  updatingStatus={updatingStatus}
                />
              </SheetContent>
            </Sheet>
          </div>
        </div>

        {messages}
        {chatInput}
      </div>

      {/* Desktop sidebar */}
      <div className="hidden md:block w-80 shrink-0 border-l overflow-y-auto">
        <TicketInfoPanel
          ticket={ticket}
          isStaff={isStaff}
          onStatusChange={handleStatusChange}
          updatingStatus={updatingStatus}
        />
      </div>
    </div>
  )
}

// ─── Ticket Info Panel (shared between sidebar & sheet) ────────────────────

function TicketInfoPanel({
  ticket,
  isStaff,
  onStatusChange,
  updatingStatus,
}: {
  ticket: any
  isStaff: boolean
  onStatusChange: (status: string) => void
  updatingStatus: boolean
}) {
  return (
    <div className="space-y-4 p-4">
      <div>
        <h2 className="font-semibold">{ticket.subject}</h2>
        <p className="text-xs text-muted-foreground mt-1">
          Created {new Date(ticket.createdAt).toLocaleString()}
        </p>
      </div>

      <Separator />

      <div className="space-y-3 text-sm">
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Status</span>
          {isStaff ? (
            <Select
              value={ticket.status}
              onValueChange={onStatusChange}
              disabled={updatingStatus}
            >
              <SelectTrigger className="w-[140px] h-7 text-xs">
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

        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Priority</span>
          <StatusBadge status={ticket.priority} />
        </div>

        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Category</span>
          <span className="text-xs">{CATEGORIES[ticket.category] || ticket.category}</span>
        </div>

        {ticket.createdBy && typeof ticket.createdBy === 'object' && (
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Author</span>
            <span className="text-xs">{ticket.createdBy.ingameNick || 'Unknown'}</span>
          </div>
        )}
      </div>

      <Separator />

      <div>
        <h3 className="text-sm font-medium mb-1">Description</h3>
        <p className="text-sm text-muted-foreground whitespace-pre-wrap">
          {extractText(ticket.description)}
        </p>
      </div>

      {ticket.attachments && ticket.attachments.length > 0 && (
        <>
          <Separator />
          <div>
            <h3 className="text-sm font-medium mb-2">Attachments</h3>
            <div className="space-y-1.5">
              {ticket.attachments.map((att: any, i: number) => {
                const file = typeof att.file === 'object' ? att.file : null
                if (!file) return null
                return (
                  <a
                    key={i}
                    href={file.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-xs text-primary hover:underline"
                  >
                    <FileIcon className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">{file.filename || att.description || 'File'}</span>
                  </a>
                )
              })}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
