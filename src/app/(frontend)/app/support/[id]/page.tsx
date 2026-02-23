'use client'

import { use, useState } from 'react'
import useSWR from 'swr'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { StatusBadge } from '@/components/ui/status-badge'
import { DetailPageSkeleton } from '@/components/ui/page-skeleton'
import { cn } from '@/lib/utils'

const fetcher = (url: string) => fetch(url).then((r) => r.json())

function extractText(richText: any): string {
  if (typeof richText === 'string') return richText
  if (!richText?.root?.children) return ''
  return richText.root.children
    .map((node: any) => {
      if (node.children) {
        return node.children.map((child: any) => child.text || '').join('')
      }
      return ''
    })
    .join('\n')
}

export default function SupportTicketPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const { data, isLoading, mutate } = useSWR(`/api/support/${id}`, fetcher)
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)

  if (isLoading) return <DetailPageSkeleton />

  const ticket = data?.ticket
  if (!ticket) {
    return (
      <div className="space-y-4">
        <Link href="/app/support" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
          &larr; Back to Support
        </Link>
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            Ticket not found.
          </CardContent>
        </Card>
      </div>
    )
  }

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!message.trim()) return
    setSending(true)
    try {
      await fetch(`/api/support/${id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message }),
      })
      setMessage('')
      mutate()
    } catch {
      // ignore
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="space-y-6">
      <Link href="/app/support" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
        &larr; Back to Support
      </Link>

      {/* Ticket Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>{ticket.subject}</CardTitle>
            <div className="flex items-center gap-2">
              <StatusBadge status={ticket.priority} />
              <StatusBadge status={ticket.status} />
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

      {/* Messages */}
      <div className="space-y-3">
        {(ticket.responses || []).map((response: any, i: number) => {
          const isStaff = response.isStaffResponse
          const authorName = typeof response.author === 'object'
            ? response.author?.ingameNick || 'Staff'
            : isStaff ? 'Staff' : 'You'

          return (
            <div
              key={i}
              className={cn(
                'flex',
                isStaff ? 'justify-start' : 'justify-end',
              )}
            >
              <div
                className={cn(
                  'max-w-[80%] rounded-lg p-3 space-y-1',
                  isStaff
                    ? 'bg-muted border'
                    : 'bg-primary text-primary-foreground',
                )}
              >
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium opacity-70">{authorName}</span>
                  <span className="text-xs opacity-50">
                    {new Date(response.timestamp).toLocaleString()}
                  </span>
                </div>
                <p className="text-sm whitespace-pre-wrap">{extractText(response.message)}</p>
              </div>
            </div>
          )
        })}
      </div>

      {/* Reply Form */}
      {ticket.status !== 'resolved' && ticket.status !== 'closed' && (
        <form onSubmit={handleSendMessage} className="flex gap-2">
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Type your message..."
            rows={2}
            className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
          />
          <Button type="submit" disabled={sending} className="self-end">
            {sending ? 'Sending...' : 'Send'}
          </Button>
        </form>
      )}
    </div>
  )
}
