'use client'

import { useState, useEffect, useCallback } from 'react'
import { Sparkles, Image, Zap } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

type RenderMode = 'quality' | 'medium' | 'performance'

const MODES = [
  { mode: 'quality' as const, icon: Sparkles, label: 'Quality' },
  { mode: 'medium' as const, icon: Image, label: 'Medium' },
  { mode: 'performance' as const, icon: Zap, label: 'Performance' },
]

/**
 * Compact render mode switcher for app header.
 * Reads/writes landing-render-mode from localStorage.
 * Uses View Transitions API for smooth switch animation.
 */
export function RenderModeToggle() {
  const [mode, setMode] = useState<RenderMode | null>(null)

  useEffect(() => {
    setMode((localStorage.getItem('landing-render-mode') as RenderMode) || 'quality')
  }, [])

  const handleChange = useCallback((m: RenderMode, e?: React.MouseEvent) => {
    if (m === mode) return
    const apply = () => {
      setMode(m)
      localStorage.setItem('landing-render-mode', m)
      window.dispatchEvent(new Event('render-mode-change'))
    }
    if ('startViewTransition' in document) {
      const cx = e ? ((e.clientX / window.innerWidth) * 100).toFixed(0) : '90'
      const cy = e ? ((e.clientY / window.innerHeight) * 100).toFixed(0) : '10'
      const styleId = `mode-transition-${Date.now()}`
      const style = document.createElement('style')
      style.id = styleId
      style.textContent = `
        ::view-transition-old(root) { animation: none; }
        ::view-transition-new(root) {
          animation: mode-circle-expand 0.5s ease-out;
        }
        @keyframes mode-circle-expand {
          from { clip-path: circle(0% at ${cx}% ${cy}%); filter: blur(4px); }
          to { clip-path: circle(150% at ${cx}% ${cy}%); filter: blur(0); }
        }
      `
      document.head.appendChild(style)
      setTimeout(() => document.getElementById(styleId)?.remove(), 2000)
      ;(document as any).startViewTransition(apply)
    } else {
      apply()
    }
  }, [mode])

  if (!mode) return null

  const current = MODES.find((m) => m.mode === mode) || MODES[0]
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
            onClick={(e) => handleChange(m, e)}
            className={m === mode ? 'bg-accent' : ''}
          >
            <Icon className="size-4 mr-2" />
            {label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
