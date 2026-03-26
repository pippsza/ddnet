'use client'

import { Sparkles, Image, Zap } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useRenderMode } from '@/hooks/useRenderMode'

const MODES = [
  { mode: 'quality' as const, icon: Sparkles, label: 'Quality' },
  { mode: 'medium' as const, icon: Image, label: 'Medium' },
  { mode: 'performance' as const, icon: Zap, label: 'Performance' },
]

/**
 * Compact render mode switcher for app header.
 */
export function RenderModeToggle() {
  const { renderMode, changeRenderMode } = useRenderMode()

  const current = MODES.find((m) => m.mode === renderMode) || MODES[0]
  const CurrentIcon = current.icon

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="icon">
          <CurrentIcon className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {MODES.map(({ mode: m, icon: Icon, label }) => (
          <DropdownMenuItem
            key={m}
            onClick={(e) => changeRenderMode(m, e)}
            className={m === renderMode ? 'bg-accent' : ''}
          >
            <Icon className="size-4 mr-2" />
            {label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
