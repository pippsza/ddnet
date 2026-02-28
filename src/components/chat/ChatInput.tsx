'use client'

import { useState, useRef, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { LexicalRichTextEditor } from '@/components/ui/lexical-editor'
import { Send, Paperclip, X, Loader2, FileIcon } from 'lucide-react'
import { toast } from 'sonner'

interface UploadedFile {
  id: string
  url: string
  filename: string
  mimeType: string
}

function isImageMime(mime: string) {
  return mime.startsWith('image/')
}

async function uploadFile(file: File): Promise<UploadedFile> {
  const form = new FormData()
  form.append('file', file)
  form.append('alt', file.name)
  const res = await fetch('/api/media', { method: 'POST', body: form })
  if (!res.ok) throw new Error('Upload failed')
  const data = await res.json()
  return {
    id: data.doc.id,
    url: data.doc.url,
    filename: data.doc.filename || file.name,
    mimeType: data.doc.mimeType || file.type,
  }
}

interface ChatInputProps {
  onSend: (content: string | any, attachments?: string[]) => void | Promise<void>
  placeholder?: string
  disabled?: boolean
  sending?: boolean
  richText?: boolean
  disabledMessage?: string
  onTyping?: () => void
  cooldownMs?: number
}

export function ChatInput({
  onSend,
  placeholder,
  disabled,
  sending,
  richText,
  disabledMessage,
  onTyping,
  cooldownMs,
}: ChatInputProps) {
  const t = useTranslations('chat')
  const resolvedPlaceholder = placeholder ?? t('input.placeholder')
  if (disabled && disabledMessage) {
    return (
      <div className="shrink-0 pt-4 border-t text-center text-sm text-muted-foreground">
        {disabledMessage}
      </div>
    )
  }

  if (richText) {
    return (
      <RichTextInput
        onSend={onSend}
        placeholder={resolvedPlaceholder}
        sending={sending}
        onTyping={onTyping}
      />
    )
  }

  return (
    <PlainTextInput
      onSend={onSend}
      placeholder={resolvedPlaceholder}
      sending={sending}
      onTyping={onTyping}
      cooldownMs={cooldownMs}
    />
  )
}

function AttachmentPreviews({
  files,
  uploading,
  onRemove,
}: {
  files: UploadedFile[]
  uploading: boolean
  onRemove: (id: string) => void
}) {
  if (files.length === 0 && !uploading) return null
  return (
    <div className="flex flex-wrap gap-2 pb-2">
      {files.map((f) => (
        <div key={f.id} className="relative group">
          {isImageMime(f.mimeType) ? (
            <img
              src={f.url}
              alt={f.filename}
              className="h-16 w-16 object-cover rounded-md border"
            />
          ) : (
            <div className="h-16 px-3 flex items-center gap-2 rounded-md border bg-muted/50">
              <FileIcon className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="text-xs text-muted-foreground truncate max-w-24">{f.filename}</span>
            </div>
          )}
          <button
            type="button"
            onClick={() => onRemove(f.id)}
            className="absolute -top-1.5 -right-1.5 rounded-full bg-destructive text-destructive-foreground p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      ))}
      {uploading && (
        <div className="h-16 w-16 rounded-md border flex items-center justify-center">
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        </div>
      )}
    </div>
  )
}

function useFileUpload() {
  const t = useTranslations('chat')
  const [files, setFiles] = useState<UploadedFile[]>([])
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const handleFiles = useCallback(async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return
    setUploading(true)
    try {
      const results = await Promise.all(Array.from(fileList).map((f) => uploadFile(f)))
      setFiles((prev) => [...prev, ...results])
    } catch {
      toast.error(t('input.uploadFailed'))
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }, [])

  const removeFile = useCallback((id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id))
  }, [])

  const clearFiles = useCallback(() => setFiles([]), [])

  const fileIds = files.map((f) => f.id)

  return { files, uploading, fileRef, handleFiles, removeFile, clearFiles, fileIds }
}

function usePasteUpload(handleFiles: (files: FileList | null) => Promise<void>) {
  const handlePaste = useCallback(
    (e: React.ClipboardEvent) => {
      const items = e.clipboardData?.items
      if (!items) return
      const fileList: File[] = []
      for (let i = 0; i < items.length; i++) {
        if (items[i].kind === 'file') {
          const file = items[i].getAsFile()
          if (file) fileList.push(file)
        }
      }
      if (fileList.length > 0) {
        e.preventDefault()
        const dt = new DataTransfer()
        fileList.forEach((f) => dt.items.add(f))
        handleFiles(dt.files)
      }
    },
    [handleFiles],
  )
  return handlePaste
}

function PlainTextInput({
  onSend,
  placeholder,
  sending,
  onTyping,
  cooldownMs,
}: {
  onSend: (content: string, attachments?: string[]) => void | Promise<void>
  placeholder?: string
  sending?: boolean
  onTyping?: () => void
  cooldownMs?: number
}) {
  const t = useTranslations('chat')
  const [text, setText] = useState('')
  const [cooldown, setCooldown] = useState(false)
  const cooldownTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const { files, uploading, fileRef, handleFiles, removeFile, clearFiles, fileIds } =
    useFileUpload()
  const handlePaste = usePasteUpload(handleFiles)

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault()
    const hasContent = text.trim() || fileIds.length > 0
    if (!hasContent || sending || cooldown || uploading) return
    const value = text.trim()
    setText('')
    onSend(value, fileIds.length > 0 ? fileIds : undefined)
    clearFiles()

    if (cooldownMs && cooldownMs > 0) {
      setCooldown(true)
      cooldownTimer.current = setTimeout(() => setCooldown(false), cooldownMs)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.ctrlKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value)
    onTyping?.()
  }

  const hasContent = text.trim() || fileIds.length > 0

  return (
    <div className="shrink-0 pt-4 border-t space-y-2">
      <AttachmentPreviews files={files} uploading={uploading} onRemove={removeFile} />
      <form onSubmit={handleSubmit} className="flex items-center gap-2 justify-center">
        <input
          ref={fileRef}
          type="file"
          multiple
          className="hidden"
          onChange={async (e) => {
            await handleFiles(e.target.files)
            textareaRef.current?.focus()
          }}
        />
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="self-end shrink-0"
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
        >
          <Paperclip className="h-4 w-4" />
        </Button>
        <Textarea
          ref={textareaRef}
          value={text}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          placeholder={cooldown ? t('input.cooldownPlaceholder') : placeholder}
          className="flex-1 min-h-[40px] max-h-[120px] resize-none"
          rows={1}
          disabled={cooldown}
        />
        <Button
          type="submit"
          size="icon"
          className="self-end shrink-0"
          disabled={sending || cooldown || uploading || !hasContent}
        >
          <Send className="h-4 w-4" />
        </Button>
      </form>
    </div>
  )
}

function RichTextInput({
  onSend,
  placeholder,
  sending,
  onTyping,
}: {
  onSend: (content: any, attachments?: string[]) => void | Promise<void>
  placeholder?: string
  sending?: boolean
  onTyping?: () => void
}) {
  const t = useTranslations('chat')
  const contentRef = useRef<any>(null)
  const editorAreaRef = useRef<HTMLDivElement>(null)
  const [key, setKey] = useState(0)
  const { files, uploading, fileRef, handleFiles, removeFile, clearFiles, fileIds } =
    useFileUpload()
  const handlePaste = usePasteUpload(handleFiles)

  const handleChange = useCallback(
    (editorState: any) => {
      contentRef.current = editorState
      onTyping?.()
    },
    [onTyping],
  )

  const handleSubmit = useCallback(() => {
    const hasContent = contentRef.current || fileIds.length > 0
    if (!hasContent || sending || uploading) return
    const content = contentRef.current
    contentRef.current = null
    setKey((k) => k + 1)
    onSend(content, fileIds.length > 0 ? fileIds : undefined)
    clearFiles()
  }, [onSend, sending, uploading, fileIds, clearFiles])

  return (
    <div ref={editorAreaRef} className="shrink-0 space-y-2 pt-4 border-t" onPaste={handlePaste}>
      <AttachmentPreviews files={files} uploading={uploading} onRemove={removeFile} />
      <LexicalRichTextEditor
        key={key}
        onChange={handleChange}
        onSubmit={handleSubmit}
        placeholder={placeholder}
        compact
      />
      <div className="flex justify-end gap-2">
        <input
          ref={fileRef}
          type="file"
          multiple
          className="hidden"
          onChange={async (e) => {
            await handleFiles(e.target.files)
            const el = editorAreaRef.current?.querySelector('[contenteditable="true"]') as HTMLElement | null
            el?.focus()
          }}
        />
        <Button
          variant="ghost"
          size="sm"
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
        >
          <Paperclip className="h-3.5 w-3.5 mr-1.5" />
          {t('input.attach')}
        </Button>
        <Button size="sm" onClick={handleSubmit} disabled={sending || uploading}>
          <Send className="h-3.5 w-3.5 mr-1.5" />
          {sending ? t('input.sending') : t('input.send')}
        </Button>
      </div>
    </div>
  )
}
