'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { Server, Copy, Check } from 'lucide-react'

export interface VerificationServer {
  name: string
  ip: string
  port: number
  region?: string | null
}

export function StepIndicator({
  step,
  label,
  description,
  active,
  completed,
}: {
  step: number
  label: string
  description: string
  active: boolean
  completed: boolean
}) {
  return (
    <div className="flex flex-col items-center text-center flex-1">
      <div
        className={cn(
          'w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-500',
          completed && 'bg-green-500 text-white shadow-[0_0_12px_rgba(34,197,94,0.4)]',
          active && !completed && 'bg-blue-500 text-white animate-pulse shadow-[0_0_12px_rgba(59,130,246,0.4)]',
          !active && !completed && 'bg-muted text-muted-foreground border border-border',
        )}
      >
        {completed ? <Check className="h-5 w-5" /> : step}
      </div>
      <p className={cn(
        'text-xs font-medium mt-2 transition-colors',
        completed && 'text-green-500',
        active && !completed && 'text-blue-500',
        !active && !completed && 'text-muted-foreground',
      )}>
        {label}
      </p>
      <p className="text-[10px] text-muted-foreground mt-0.5">{description}</p>
    </div>
  )
}

export function StepConnector({ completed }: { completed: boolean }) {
  return (
    <div className={cn(
      'h-0.5 flex-1 mt-5 transition-colors duration-500',
      completed ? 'bg-green-500' : 'bg-border',
    )} />
  )
}

export function ServerListItem({ server }: { server: VerificationServer }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    navigator.clipboard.writeText(`${server.ip}:${server.port}`)
    setCopied(true)
    toast.success('Server address copied!')
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="flex items-center justify-between gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
      <div className="flex items-center gap-3">
        <Server className="h-4 w-4 shrink-0 text-muted-foreground" />
        <div>
          <p className="text-sm font-medium">{server.name}</p>
          <p className="text-xs font-mono text-muted-foreground">{server.ip}:{server.port}</p>
        </div>
        {server.region && (
          <Badge variant="outline" className="text-xs py-0">{server.region}</Badge>
        )}
      </div>
      <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={handleCopy}>
        {copied ? (
          <Check className="h-3.5 w-3.5 text-green-500" />
        ) : (
          <Copy className="h-3.5 w-3.5" />
        )}
      </Button>
    </div>
  )
}

export function Spinner({ className }: { className?: string }) {
  return (
    <svg
      className={cn('w-5 h-5 animate-spin', className)}
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  )
}
