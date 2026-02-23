'use client'

import { use, useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import useSWR from 'swr'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { LexicalRichTextEditor } from '@/components/ui/lexical-editor'
import { DetailPageSkeleton } from '@/components/ui/page-skeleton'
import { ArrowLeft } from 'lucide-react'

const fetcher = (url: string) => fetch(url).then((r) => r.json())

const CATEGORIES = [
  { value: 'news', label: 'News' },
  { value: 'tutorial', label: 'Tutorial' },
  { value: 'guide', label: 'Guide' },
  { value: 'update', label: 'Update' },
  { value: 'event', label: 'Event' },
  { value: 'announcement', label: 'Announcement' },
]

export default function ArticleEditPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = use(params)
  const router = useRouter()

  const { data, isLoading } = useSWR(
    `/api/articles?where[slug][equals]=${encodeURIComponent(slug)}&depth=1&limit=1`,
    fetcher,
  )

  const article = data?.docs?.[0]

  const [title, setTitle] = useState('')
  const [excerpt, setExcerpt] = useState('')
  const [category, setCategory] = useState('news')
  const [tags, setTags] = useState('')
  const [featured, setFeatured] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const contentRef = useRef<any>(null)
  const [initialized, setInitialized] = useState(false)

  // Populate form fields when article loads
  useEffect(() => {
    if (article && !initialized) {
      setTitle(article.title || '')
      setExcerpt(article.excerpt || '')
      setCategory(article.category || 'news')
      setTags(
        (article.tags || []).map((t: any) => t.tag || t).join(', '),
      )
      setFeatured(article.featured || false)
      contentRef.current = article.content
      setInitialized(true)
    }
  }, [article, initialized])

  const handleContentChange = (editorState: any) => {
    contentRef.current = editorState
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim() || !contentRef.current || !article) return
    setSubmitting(true)
    setError('')
    try {
      const res = await fetch(`/api/articles/${article.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          content: contentRef.current,
          excerpt: excerpt.trim() || undefined,
          category,
          tags: tags
            .split(',')
            .map((t) => t.trim())
            .filter(Boolean)
            .map((t) => ({ tag: t })),
          featured,
        }),
      })
      const responseData = await res.json()
      if (!res.ok)
        throw new Error(
          responseData.errors?.[0]?.message || 'Failed to update article',
        )
      router.push(`/app/articles/${article.slug}`)
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : 'Failed to update article',
      )
      setSubmitting(false)
    }
  }

  if (isLoading || (article && !initialized)) return <DetailPageSkeleton />

  if (!article) {
    return (
      <div className="space-y-4">
        <Link
          href="/app/articles"
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Articles
        </Link>
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            Article not found.
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Link
        href={`/app/articles/${slug}`}
        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" /> Back to Article
      </Link>

      <Card>
        <CardHeader>
          <CardTitle>Edit Article</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label>Title</Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Article title"
                required
                maxLength={200}
              />
            </div>
            <div>
              <Label>Excerpt</Label>
              <Textarea
                value={excerpt}
                onChange={(e) => setExcerpt(e.target.value)}
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
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                placeholder="tag1, tag2, tag3"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Comma-separated
              </p>
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
              {initialized && (
                <LexicalRichTextEditor
                  onChange={handleContentChange}
                  placeholder="Write your article..."
                  initialContent={article.content}
                />
              )}
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <div className="flex gap-2">
              <Button type="submit" disabled={submitting}>
                {submitting ? 'Saving...' : 'Save Changes'}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
              >
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
