'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { LexicalRichTextEditor } from '@/components/ui/lexical-editor'
import { Send } from 'lucide-react'

interface ChatInputProps {
  onSend: (content: string | any) => void | Promise<void>
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
  placeholder = 'Type a message... (Shift+Enter for new line)',
  disabled,
  sending,
  richText,
  disabledMessage,
  onTyping,
  cooldownMs,
}: ChatInputProps) {
  if (disabled && disabledMessage) {
    return (
      <div className="shrink-0 pt-4 border-t text-center text-sm text-muted-foreground">
        {disabledMessage}
      </div>
    )
  }

  if (richText) {
    return <RichTextInput onSend={onSend} placeholder={placeholder} sending={sending} onTyping={onTyping} />
  }

  return <PlainTextInput onSend={onSend} placeholder={placeholder} sending={sending} onTyping={onTyping} cooldownMs={cooldownMs} />
}

function PlainTextInput({
  onSend,
  placeholder,
  sending,
  onTyping,
  cooldownMs,
}: {
  onSend: (content: string) => void | Promise<void>
  placeholder?: string
  sending?: boolean
  onTyping?: () => void
  cooldownMs?: number
}) {
  const [text, setText] = useState('')
  const [cooldown, setCooldown] = useState(false)
  const cooldownTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault()
    if (!text.trim() || sending || cooldown) return
    const value = text.trim()
    setText('')
    onSend(value)

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

  return (
    <form onSubmit={handleSubmit} className="shrink-0 flex gap-2 pt-4 border-t">
      <Textarea
        value={text}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder={cooldown ? 'Wait...' : placeholder}
        className="flex-1 min-h-[40px] max-h-[120px] resize-none"
        rows={1}
        disabled={cooldown}
      />
      <Button type="submit" size="icon" className="self-end shrink-0" disabled={sending || cooldown || !text.trim()}>
        <Send className="h-4 w-4" />
      </Button>
    </form>
  )
}

function RichTextInput({
  onSend,
  placeholder,
  sending,
  onTyping,
}: {
  onSend: (content: any) => void | Promise<void>
  placeholder?: string
  sending?: boolean
  onTyping?: () => void
}) {
  const contentRef = useRef<any>(null)
  const [key, setKey] = useState(0)

  const handleChange = useCallback((editorState: any) => {
    contentRef.current = editorState
    onTyping?.()
  }, [onTyping])

  const handleSubmit = useCallback(() => {
    if (!contentRef.current || sending) return
    const content = contentRef.current
    contentRef.current = null
    setKey((k) => k + 1)
    onSend(content)
  }, [onSend, sending])

  return (
    <div className="shrink-0 space-y-2 pt-4 border-t">
      <LexicalRichTextEditor
        key={key}
        onChange={handleChange}
        onSubmit={handleSubmit}
        placeholder={placeholder}
        compact
      />
      <div className="flex justify-end">
        <Button size="sm" onClick={handleSubmit} disabled={sending}>
          <Send className="h-3.5 w-3.5 mr-1.5" />
          {sending ? 'Sending...' : 'Send'}
        </Button>
      </div>
    </div>
  )
}
