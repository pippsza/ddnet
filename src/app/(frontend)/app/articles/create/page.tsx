'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { LexicalRichTextEditor } from '@/components/ui/lexical-editor'
import { ArrowLeft } from 'lucide-react'

const CATEGORIES = [
  { value: 'news', label: 'News' },
  { value: 'tutorial', label: 'Tutorial' },
  { value: 'guide', label: 'Guide' },
  { value: 'update', label: 'Update' },
  { value: 'event', label: 'Event' },
  { value: 'announcement', label: 'Announcement' },
]

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim()
}

export default function ArticleCreatePage() {
  const router = useRouter()
  const [category, setCategory] = useState('news')
  const [featured, setFeatured] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const titleRef = useRef<HTMLInputElement>(null)
  const excerptRef = useRef<HTMLTextAreaElement>(null)
  const tagsRef = useRef<HTMLInputElement>(null)
  const contentRef = useRef<any>(null)

  const handleContentChange = (editorState: any) => {
    contentRef.current = editorState
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const title = titleRef.current?.value?.trim() || ''
    const excerpt = excerptRef.current?.value?.trim() || ''
    const tags = tagsRef.current?.value || ''
    if (!title || !contentRef.current) return
    setSubmitting(true)
    setError('')
    try {
      const slug = slugify(title) + '-' + Date.now().toString(36)
      const res = await fetch('/api/articles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          slug,
          content: contentRef.current,
          excerpt: excerpt || undefined,
          category,
          tags: tags
            .split(',')
            .map((t) => t.trim())
            .filter(Boolean)
            .map((t) => ({ tag: t })),
          featured,
          _status: 'published',
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.errors?.[0]?.message || 'Failed to create article')
      router.push(`/app/articles/${data.doc.slug}`)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create article')
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      <Link
        href="/app/articles"
        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" /> Back to Articles
      </Link>

      <Card>
        <CardHeader>
          <CardTitle>Create Article</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label>Title</Label>
              <Input
                ref={titleRef}
                placeholder="Article title"
                required
                maxLength={200}
              />
            </div>
            <div>
              <Label>Excerpt</Label>
              <Textarea
                ref={excerptRef}
                placeholder="Short description for preview..."
                rows={2}
                className="resize-none"
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
                    <SelectItem key={c.value} value={c.value}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Tags</Label>
              <Input
                ref={tagsRef}
                placeholder="tag1, tag2, tag3"
              />
              <p className="text-xs text-muted-foreground mt-1">Comma-separated</p>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="featured"
                checked={featured}
                onCheckedChange={(checked) => setFeatured(checked === true)}
              />
              <Label htmlFor="featured" className="mb-0 cursor-pointer">
                Featured article
              </Label>
            </div>
            <div>
              <Label>Content</Label>
              <LexicalRichTextEditor
                onChange={handleContentChange}
                placeholder="Write your article..."
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <div className="flex gap-2">
              <Button type="submit" disabled={submitting}>
                {submitting ? 'Publishing...' : 'Publish Article'}
              </Button>
              <Button type="button" variant="outline" onClick={() => router.back()}>
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
