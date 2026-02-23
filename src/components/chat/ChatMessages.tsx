'use client'

import { useRef, useEffect } from 'react'
import { cn } from '@/lib/utils'

interface ChatMessagesProps {
  children: React.ReactNode
  scrollKey?: number | string
  emptyText?: string
  className?: string
  typingText?: string | null
}

export function ChatMessages({
  children,
  scrollKey,
  emptyText = 'No messages yet.',
  className,
  typingText,
}: ChatMessagesProps) {
  const endRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [scrollKey])

  return (
    <div
      className={cn('flex-1 min-h-0 overflow-y-auto overflow-x-hidden space-y-3 py-2 px-1', className)}
    >
      {children || (
        <div className="text-center text-muted-foreground text-sm py-8">{emptyText}</div>
      )}
      {typingText && (
        <div className="flex items-center gap-2 px-2 py-1">
          <span className="flex gap-0.5">
            <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/50 animate-bounce [animation-delay:0ms]" />
            <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/50 animate-bounce [animation-delay:150ms]" />
            <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/50 animate-bounce [animation-delay:300ms]" />
          </span>
          <span className="text-xs text-muted-foreground italic">{typingText}</span>
        </div>
      )}
      <div ref={endRef} />
    </div>
  )
}
