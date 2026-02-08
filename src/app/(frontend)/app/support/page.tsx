'use client'

import { useState } from 'react'
import useSWR from 'swr'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { StatusBadge } from '@/components/ui/status-badge'
import { CardListSkeleton } from '@/components/ui/page-skeleton'

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

export default function SupportPage() {
  const { data, isLoading, mutate } = useSWR('/api/support', fetcher)
  const [showForm, setShowForm] = useState(false)
  const [subject, setSubject] = useState('')
  const [category, setCategory] = useState('bug_report')
  const [description, setDescription] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!subject.trim() || !description.trim()) return
    setSubmitting(true)
    setError('')
    try {
      const res = await fetch('/api/support', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subject, category, description, priority: 'medium' }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setShowForm(false)
      setSubject('')
      setDescription('')
      mutate()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create ticket')
    } finally {
      setSubmitting(false)
    }
  }

  if (isLoading) return <CardListSkeleton />

  const tickets = data?.tickets || []

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Support</h1>
        <Button onClick={() => setShowForm(!showForm)}>
          {showForm ? 'Cancel' : 'New Ticket'}
        </Button>
      </div>

      {/* New Ticket Form */}
      {showForm && (
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
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {CATEGORIES.map((c) => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <Label>Description</Label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe your issue in detail..."
                  required
                  rows={5}
                  className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
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

      {/* Tickets List */}
      <div className="space-y-3">
        {tickets.length > 0 ? (
          tickets.map((ticket: any) => (
            <Link key={ticket.id} href={`/app/support/${ticket.id}`} className="block">
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
        ) : (
          <Card>
            <CardContent className="p-8 text-center text-muted-foreground">
              No support tickets yet. Create one if you need help!
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
