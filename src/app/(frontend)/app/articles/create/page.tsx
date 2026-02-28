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
import { useTranslations } from 'next-intl'
import { ArrowLeft } from 'lucide-react'

const CATEGORY_KEYS = ['news', 'tutorial', 'guide', 'update', 'event', 'announcement'] as const

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim()
}

export default function ArticleCreatePage() {
  const t = useTranslations('forum')
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
            .map((s) => s.trim())
            .filter(Boolean)
            .map((s) => ({ tag: s })),
          featured,
          _status: 'published',
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.errors?.[0]?.message || t('articleCreate.failed'))
      router.push(`/app/articles/${data.doc.slug}`)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t('articleCreate.failed'))
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      <Link
        href="/app/articles"
        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" /> {t('articleCreate.backToArticles')}
      </Link>

      <Card>
        <CardHeader>
          <CardTitle>{t('articleCreate.cardTitle')}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label>{t('articleCreate.titleLabel')}</Label>
              <Input
                ref={titleRef}
                placeholder={t('articleCreate.titlePlaceholder')}
                required
                maxLength={200}
              />
            </div>
            <div>
              <Label>{t('articleCreate.excerptLabel')}</Label>
              <Textarea
                ref={excerptRef}
                placeholder={t('articleCreate.excerptPlaceholder')}
                rows={2}
                className="resize-none"
              />
            </div>
            <div>
              <Label>{t('articleCreate.categoryLabel')}</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORY_KEYS.map((key) => (
                    <SelectItem key={key} value={key}>
                      {t(`articles.categories.${key}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>{t('articleCreate.tagsLabel')}</Label>
              <Input
                ref={tagsRef}
                placeholder={t('articleCreate.tagsPlaceholder')}
              />
              <p className="text-xs text-muted-foreground mt-1">{t('articleCreate.tagsHelp')}</p>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="featured"
                checked={featured}
                onCheckedChange={(checked) => setFeatured(checked === true)}
              />
              <Label htmlFor="featured" className="mb-0 cursor-pointer">
                {t('articleCreate.featured')}
              </Label>
            </div>
            <div>
              <Label>{t('articleCreate.contentLabel')}</Label>
              <LexicalRichTextEditor
                onChange={handleContentChange}
                placeholder={t('articleCreate.contentPlaceholder')}
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <div className="flex gap-2">
              <Button type="submit" disabled={submitting}>
                {submitting ? t('articleCreate.publishing') : t('articleCreate.publishButton')}
              </Button>
              <Button type="button" variant="outline" onClick={() => router.back()}>
                {t('articleCreate.cancelButton')}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
