'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { LexicalRichTextEditor } from '@/components/ui/lexical-editor'
import { MediaAttachments, type UploadedFile } from '@/components/ui/media-attachments'
import { useTranslations } from 'next-intl'
import { ArrowLeft } from 'lucide-react'

const CATEGORY_KEYS = ['general', 'help', 'suggestions', 'bugs', 'maps', 'clans', 'offtopic'] as const

export default function ForumCreatePage() {
  const t = useTranslations('forum')
  const router = useRouter()
  const [category, setCategory] = useState('general')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [files, setFiles] = useState<UploadedFile[]>([])
  const titleRef = useRef<HTMLInputElement>(null)
  const contentRef = useRef<any>(null)

  const handleContentChange = (editorState: any) => {
    contentRef.current = editorState
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const title = titleRef.current?.value?.trim() || ''
    if (!title || !contentRef.current) return
    setSubmitting(true)
    setError('')
    try {
      const res = await fetch('/api/forum', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          category,
          content: contentRef.current,
          ...(files.length > 0 && { images: files.map((f) => f.id) }),
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      router.push(`/app/forum/${data.post.id}`)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t('create.failed'))
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      <Link
        href="/app/forum"
        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" /> {t('create.backToForum')}
      </Link>

      <Card>
        <CardHeader>
          <CardTitle>{t('create.cardTitle')}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label>{t('create.titleLabel')}</Label>
              <Input
                ref={titleRef}
                placeholder={t('create.titlePlaceholder')}
                required
                maxLength={200}
              />
            </div>
            <div>
              <Label>{t('create.categoryLabel')}</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORY_KEYS.map((key) => (
                    <SelectItem key={key} value={key}>
                      {t(`list.categories.${key}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>{t('create.contentLabel')}</Label>
              <LexicalRichTextEditor
                onChange={handleContentChange}
                placeholder={t('create.contentPlaceholder')}
              />
            </div>
            <div>
              <Label>{t('create.attachmentsLabel')}</Label>
              <MediaAttachments files={files} onFilesChange={setFiles} />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <div className="flex gap-2">
              <Button type="submit" disabled={submitting}>
                {submitting ? t('create.creating') : t('create.createButton')}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
              >
                {t('create.cancelButton')}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
