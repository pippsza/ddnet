'use client'

import { useState } from 'react'
import useSWR from 'swr'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { StatusBadge } from '@/components/ui/status-badge'
import { CardListSkeleton } from '@/components/ui/page-skeleton'

const fetcher = (url: string) => fetch(url).then((r) => r.json())

const STATUS_FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'open', label: 'Open' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'waiting_for_user', label: 'Waiting' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'closed', label: 'Closed' },
]

export default function AdminTicketsPage() {
  const [statusFilter, setStatusFilter] = useState('all')
  const { data, isLoading } = useSWR(
    `/api/admin/tickets?status=${statusFilter}`,
    fetcher,
  )

  if (isLoading) return <CardListSkeleton />

  const tickets = data?.tickets || []

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Support Tickets</h1>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        {STATUS_FILTERS.map((f) => (
          <Button
            key={f.value}
            variant={statusFilter === f.value ? 'default' : 'outline'}
            size="sm"
            onClick={() => setStatusFilter(f.value)}
          >
            {f.label}
          </Button>
        ))}
      </div>

      {/* Tickets */}
      <div className="space-y-3">
        {tickets.length > 0 ? (
          tickets.map((ticket: any) => {
            const author = typeof ticket.createdBy === 'object'
              ? ticket.createdBy?.username
              : 'Unknown'

            return (
              <Link key={ticket.id} href={`/app/support/${ticket.id}`} className="block">
                <Card className="hover:shadow-md hover:border-primary/30 transition-all">
                  <CardContent className="flex items-center justify-between p-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm truncate">{ticket.subject}</span>
                        <StatusBadge status={ticket.status} />
                        <StatusBadge status={ticket.priority} />
                      </div>
                      <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                        <span>by {author}</span>
                        <span>&middot;</span>
                        <span>{ticket.category?.replace(/_/g, ' ')}</span>
                        <span>&middot;</span>
                        <span>{new Date(ticket.createdAt).toLocaleDateString()}</span>
                        <span>&middot;</span>
                        <span>{ticket.responses?.length || 0} responses</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            )
          })
        ) : (
          <Card>
            <CardContent className="p-8 text-center text-muted-foreground">
              No tickets found for this filter.
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
