'use client'

import { cn } from '@/lib/utils'

interface ChatBubbleProps {
  isOwn: boolean
  children: React.ReactNode
  header?: React.ReactNode
  avatar?: React.ReactNode
  isOptimistic?: boolean
  className?: string
}

export function ChatBubble({
  isOwn,
  children,
  header,
  avatar,
  isOptimistic,
  className,
}: ChatBubbleProps) {
  return (
    <div
      className={cn(
        'flex items-end gap-3',
        isOwn ? 'justify-end' : 'justify-start',
        className,
      )}
    >
      {!isOwn && avatar}

      <div className="max-w-[80%]">
        {header && (
          <div
            className={cn(
              'flex items-center gap-2 mb-1',
              isOwn ? 'justify-end' : 'justify-start',
            )}
          >
            {header}
          </div>
        )}
        <div
          className={cn(
            'rounded-lg px-4 py-3',
            isOwn
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted border',
            isOptimistic && 'opacity-70',
          )}
        >
          {children}
        </div>
      </div>

      {isOwn && avatar}
    </div>
  )
}
