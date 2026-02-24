'use client'

import { useState, Suspense } from 'react'
import useSWR from 'swr'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { StatusBadge } from '@/components/ui/status-badge'
import { CardListSkeleton } from '@/components/ui/page-skeleton'
import { PaginationControls } from '@/components/ui/pagination-controls'
import { usePagination } from '@/hooks/use-pagination'
import { usePermissions } from '@/hooks/use-permissions'
import { CheckCircle } from 'lucide-react'

const fetcher = (url: string) => fetch(url).then((r) => r.json())

const CATEGORIES = [
  { value: 'bug_report', label: 'Bug Report' },
  { value: 'account_issues', label: 'Account Issues' },
  { value: 'name_change', label: 'Name Change' },
  { value: 'nickname_conflict', label: 'Nickname Conflict' },
  { value: 'verification_request', label: 'Verification Request' },
  { value: 'game_statistics', label: 'Game Statistics' },
  { value: 'other', label: 'Other' },
]

function SupportContent() {
  const { page, setPage, buildUrl } = usePagination({ defaultLimit: 20 })
  const { data: meData } = useSWR('/api/users/me', fetcher)
  const isLoggedIn = !!meData?.user
  const { hasPermission: hasPerm } = usePermissions()
  const isStaff = hasPerm('support', 'view_all')

  const { data, isLoading, mutate } = useSWR(
    isLoggedIn ? buildUrl('/api/support?sort=-createdAt') : null,
    fetcher,
  )
  const [showForm, setShowForm] = useState(false)
  const [subject, setSubject] = useState('')
  const [category, setCategory] = useState('bug_report')
  const [description, setDescription] = useState('')
  const [contactEmail, setContactEmail] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')

  const tickets = data?.docs || []
  const totalPages = data?.totalPages || 1
  const totalDocs = data?.totalDocs || 0

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!subject.trim() || !description.trim()) return
    if (!isLoggedIn && !contactEmail.trim()) return
    setSubmitting(true)
    setError('')
    try {
      const res = await fetch('/api/support/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject,
          category,
          description,
          priority: 'medium',
          ...(!isLoggedIn && { contactEmail }),
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setShowForm(false)
      setSubject('')
      setDescription('')
      setContactEmail('')
      if (isLoggedIn) {
        mutate()
      } else {
        setSubmitted(true)
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create ticket')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Support</h1>
        {!submitted && (
          <Button onClick={() => setShowForm(!showForm)}>
            {showForm ? 'Cancel' : 'New Ticket'}
          </Button>
        )}
      </div>

      {/* Success message for anonymous submissions */}
      {submitted && (
        <Card>
          <CardContent className="p-8 text-center space-y-3">
            <CheckCircle className="h-12 w-12 text-green-500 mx-auto" />
            <p className="font-semibold">Ticket submitted!</p>
            <p className="text-sm text-muted-foreground">
              We&apos;ll review your request and respond to {contactEmail || 'your email'}.
            </p>
            <Button variant="outline" onClick={() => { setSubmitted(false); setShowForm(false) }}>
              Submit another ticket
            </Button>
          </CardContent>
        </Card>
      )}

      {/* New Ticket Form */}
      {showForm && !submitted && (
        <Card>
          <CardHeader>
            <CardTitle>Create Support Ticket</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label>Subject</Label>
                <Input
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Brief description of your issue"
                  required
                />
              </div>
              <div>
                <Label>Category</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((c) => (
                      <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {!isLoggedIn && (
                <div>
                  <Label>Contact Email</Label>
                  <Input
                    type="email"
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                    placeholder="your@email.com"
                    required
                  />
                </div>
              )}
              <div>
                <Label>Description</Label>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe your issue in detail..."
                  required
                  rows={5}
                  className="resize-none"
                />
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <Button type="submit" disabled={submitting}>
                {submitting ? 'Submitting...' : 'Submit Ticket'}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Tickets List — only for logged-in users */}
      {isLoggedIn && (
        <>
          {isLoading ? (
            <CardListSkeleton count={3} />
          ) : (
            <div className="space-y-3">
              <h2 className="text-lg font-semibold">{isStaff ? 'All Tickets' : 'Your Tickets'}</h2>
              {tickets.length > 0 ? (
                tickets.map((ticket: any) => (
                  <Link key={ticket.id} href={`/support/${ticket.id}`} className="block">
                    <Card className="hover:shadow-md hover:border-primary/30 transition-all">
                      <CardContent className="flex items-center justify-between p-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-sm truncate">{ticket.subject}</span>
                            <StatusBadge status={ticket.status} />
                          </div>
                          <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                            <span>{CATEGORIES.find((c) => c.value === ticket.category)?.label || ticket.category}</span>
                            <span>&middot;</span>
                            <span>{new Date(ticket.createdAt).toLocaleDateString()}</span>
                            <span>&middot;</span>
                            <span>{ticket.responses?.length || 0} responses</span>
                          </div>
                        </div>
                        <StatusBadge status={ticket.priority} />
                      </CardContent>
                    </Card>
                  </Link>
                ))
              ) : !showForm && !submitted ? (
                <Card>
                  <CardContent className="p-8 text-center text-muted-foreground">
                    No support tickets yet. Create one if you need help!
                  </CardContent>
                </Card>
              ) : null}
            </div>
          )}

          <PaginationControls
            page={page}
            totalPages={totalPages}
            totalDocs={totalDocs}
            limit={20}
            onPageChange={setPage}
          />
        </>
      )}
    </div>
  )
}

export default function SupportPage() {
  return (
    <Suspense fallback={<CardListSkeleton />}>
      <SupportContent />
    </Suspense>
  )
}
