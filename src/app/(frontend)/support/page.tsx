'use client'

import { useState, useEffect, Suspense } from 'react'
import useSWR from 'swr'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { MediaAttachments, type UploadedFile } from '@/components/ui/media-attachments'
import { StatusBadge } from '@/components/ui/status-badge'
import { CardListSkeleton } from '@/components/ui/page-skeleton'
import { PaginationControls } from '@/components/ui/pagination-controls'
import { usePagination } from '@/hooks/use-pagination'
import { usePermissions } from '@/hooks/use-permissions'
import { CheckCircle } from 'lucide-react'
import { PageTransition, StaggerContainer, StaggerItem } from '@/components/ui/animations'

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

  const [showForm, setShowForm] = useState(false)
  const [subject, setSubject] = useState('')
  const [category, setCategory] = useState('bug_report')
  const [description, setDescription] = useState('')
  const [contactName, setContactName] = useState('')
  const [contactDiscord, setContactDiscord] = useState('')
  const [files, setFiles] = useState<UploadedFile[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  // Load saved contactName from localStorage for anonymous users
  const [savedName, setSavedName] = useState<string | null>(null)
  useEffect(() => {
    const stored = localStorage.getItem('support_contactName')
    if (stored) {
      setSavedName(stored)
      setContactName(stored)
    }
  }, [])

  // Fetch tickets: logged-in users by auth, anonymous by saved contactName
  const ticketUrl = isLoggedIn
    ? buildUrl('/api/support?sort=-createdAt')
    : savedName
      ? buildUrl(`/api/support?where[contactName][equals]=${encodeURIComponent(savedName)}&sort=-createdAt`)
      : null

  const { data, isLoading, mutate } = useSWR(ticketUrl, fetcher)

  const tickets = data?.docs || []
  const totalPages = data?.totalPages || 1
  const totalDocs = data?.totalDocs || 0

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!subject.trim() || !description.trim()) return
    if (!isLoggedIn && !contactDiscord.trim()) return
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
          ...(!isLoggedIn && { contactName, contactDiscord }),
          ...(files.length > 0 && { attachments: files.map((f) => f.id) }),
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setShowForm(false)
      setSubject('')
      setDescription('')
      setFiles([])
      if (!isLoggedIn && contactName.trim()) {
        localStorage.setItem('support_contactName', contactName.trim())
        setSavedName(contactName.trim())
      }
      setContactDiscord('')
      mutate()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create ticket')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <PageTransition className="space-y-6">
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
                <>
                  <div>
                    <Label>Your Name</Label>
                    <Input
                      value={contactName}
                      onChange={(e) => setContactName(e.target.value)}
                      placeholder="Your name or username"
                      required
                    />
                  </div>
                  <div>
                    <Label>Discord</Label>
                    <Input
                      value={contactDiscord}
                      onChange={(e) => setContactDiscord(e.target.value)}
                      placeholder="your_discord_username"
                      required
                    />
                  </div>
                </>
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
              <div>
                <Label>Attachments</Label>
                <MediaAttachments files={files} onFilesChange={setFiles} />
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <Button type="submit" disabled={submitting}>
                {submitting ? 'Submitting...' : 'Submit Ticket'}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Welcome banner — show when no tickets and form is closed */}
      {!showForm && !isLoading && tickets.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="p-8 text-center space-y-3">
            <CheckCircle className="h-10 w-10 text-muted-foreground/40 mx-auto" />
            <p className="font-medium">
              {isLoggedIn ? 'No open tickets' : 'Need help?'}
            </p>
            <p className="text-sm text-muted-foreground max-w-sm mx-auto">
              Have a question, found a bug, or need help with your account? Our support team is here to help.
            </p>
            <Button variant="outline" onClick={() => setShowForm(true)}>
              Create a Ticket
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Tickets List */}
      {isLoading ? (
        <CardListSkeleton count={3} />
      ) : tickets.length > 0 ? (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold">{isStaff ? 'All Tickets' : 'Your Tickets'}</h2>
          <StaggerContainer className="space-y-3">
            {tickets.map((ticket: any) => (
              <StaggerItem key={ticket.id}>
                <Link href={`/support/${ticket.id}`} className="block">
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
              </StaggerItem>
            ))}
          </StaggerContainer>
        </div>
      ) : null}

      {ticketUrl && (
        <PaginationControls
          page={page}
          totalPages={totalPages}
          totalDocs={totalDocs}
          limit={20}
          onPageChange={setPage}
        />
      )}
    </PageTransition>
  )
}

export default function SupportPage() {
  return (
    <Suspense fallback={<CardListSkeleton />}>
      <SupportContent />
    </Suspense>
  )
}
