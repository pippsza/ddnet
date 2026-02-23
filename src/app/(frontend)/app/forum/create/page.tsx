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
import { ArrowLeft } from 'lucide-react'

const CATEGORIES = [
  { value: 'general', label: 'General' },
  { value: 'help', label: 'Help' },
  { value: 'suggestions', label: 'Suggestions' },
  { value: 'bugs', label: 'Bugs' },
  { value: 'maps', label: 'Maps' },
  { value: 'clans', label: 'Clans' },
  { value: 'offtopic', label: 'Off-topic' },
]

export default function ForumCreatePage() {
  const router = useRouter()
  const [category, setCategory] = useState('general')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
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
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      router.push(`/app/forum/${data.post.id}`)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create post')
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      <Link
        href="/app/forum"
        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" /> Back to Forum
      </Link>

      <Card>
        <CardHeader>
          <CardTitle>Create New Post</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label>Title</Label>
              <Input
                ref={titleRef}
                placeholder="Post title"
                required
                maxLength={200}
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
              <Label>Content</Label>
              <LexicalRichTextEditor
                onChange={handleContentChange}
                placeholder="Write your post..."
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <div className="flex gap-2">
              <Button type="submit" disabled={submitting}>
                {submitting ? 'Creating...' : 'Create Post'}
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
