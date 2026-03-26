'use client'

import { useState } from 'react'
import { useTheme } from 'next-themes'
import { themes, themeClassMap } from '@/lib/themes'
import { useRenderMode } from '@/hooks/useRenderMode'
import { Palette, X, ChevronDown, ChevronUp, Sparkles, Image, Zap } from 'lucide-react'
import { cn } from '@/lib/utils'

type RenderMode = 'quality' | 'medium' | 'performance'

const RENDER_MODES: { mode: RenderMode; icon: typeof Sparkles; label: string }[] = [
  { mode: 'quality', icon: Sparkles, label: 'Quality' },
  { mode: 'medium', icon: Image, label: 'Medium' },
  { mode: 'performance', icon: Zap, label: 'Perf' },
]

export function ThemeDebugPanel() {
  const { theme, setTheme } = useTheme()
  const { renderMode, changeRenderMode, mapActive } = useRenderMode()
  const [open, setOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(false)

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="fixed top-4 left-4 z-[9999] p-2 rounded-full bg-black/70 text-white backdrop-blur-md border border-white/20 hover:bg-black/90 transition-all hover:scale-110"
        title="Theme Debug"
      >
        <Palette className="size-4" />
      </button>
    )
  }

  return (
    <div className="fixed top-4 left-4 z-[9999] w-64 rounded-xl bg-black/85 backdrop-blur-xl border border-white/15 text-white shadow-2xl">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-white/10">
        <div className="flex items-center gap-2">
          <Palette className="size-3.5 text-purple-400" />
          <span className="text-xs font-semibold">Theme Debug</span>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => setCollapsed(!collapsed)} className="p-1 hover:bg-white/10 rounded">
            {collapsed ? <ChevronDown className="size-3" /> : <ChevronUp className="size-3" />}
          </button>
          <button onClick={() => setOpen(false)} className="p-1 hover:bg-white/10 rounded">
            <X className="size-3" />
          </button>
        </div>
      </div>

      {!collapsed && (
        <div className="p-3 space-y-3 max-h-[70vh] overflow-y-auto">
          {/* Current state */}
          <div className="text-[10px] space-y-1 bg-white/5 rounded-lg p-2">
            <div className="flex justify-between">
              <span className="text-white/50">Theme:</span>
              <span className="font-mono text-purple-300">{theme}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-white/50">Render:</span>
              <span className="font-mono text-emerald-300">{renderMode}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-white/50">Map active:</span>
              <span className={cn('font-mono', mapActive ? 'text-emerald-300' : 'text-orange-300')}>
                {mapActive ? 'yes' : 'no'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-white/50">CSS class:</span>
              <span className="font-mono text-sky-300 text-[9px]">
                {theme ? themeClassMap[theme] || '?' : '—'}
              </span>
            </div>
          </div>

          {/* Render mode switcher */}
          <div>
            <div className="text-[10px] text-white/40 uppercase tracking-wider mb-1.5">Render Mode</div>
            <div className="flex gap-1">
              {RENDER_MODES.map(({ mode, icon: Icon, label }) => (
                <button
                  key={mode}
                  onClick={() => changeRenderMode(mode)}
                  className={cn(
                    'flex-1 flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg text-[10px] font-medium transition-all',
                    renderMode === mode
                      ? 'bg-emerald-500/30 text-emerald-300 ring-1 ring-emerald-500/40'
                      : 'bg-white/5 text-white/50 hover:bg-white/10 hover:text-white/80',
                  )}
                >
                  <Icon className="size-3" />
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Theme grid */}
          <div>
            <div className="text-[10px] text-white/40 uppercase tracking-wider mb-1.5">Themes</div>
            <div className="grid grid-cols-2 gap-1">
              {themes.map((t) => {
                const isActive = theme === t.id
                return (
                  <button
                    key={t.id}
                    onClick={() => {
                      setTheme(t.id)
                      // Auto-switch render mode to see the theme properly
                      if (t.id === 'map-active' && renderMode === 'performance') {
                        changeRenderMode('quality')
                      } else if (t.id !== 'map-active' && renderMode !== 'performance') {
                        changeRenderMode('performance')
                      }
                    }}
                    className={cn(
                      'flex items-center gap-2 px-2 py-1.5 rounded-lg text-left transition-all',
                      isActive
                        ? 'bg-purple-500/25 ring-1 ring-purple-500/40'
                        : 'bg-white/5 hover:bg-white/10',
                    )}
                  >
                    {/* Color preview dots */}
                    <div className="flex flex-col gap-0.5 shrink-0">
                      <div className="flex gap-0.5">
                        <div className="size-2 rounded-sm" style={{ backgroundColor: t.preview.background }} />
                        <div className="size-2 rounded-sm" style={{ backgroundColor: t.preview.primary }} />
                      </div>
                      <div className="flex gap-0.5">
                        <div className="size-2 rounded-sm" style={{ backgroundColor: t.preview.card }} />
                        <div className="size-2 rounded-sm" style={{ backgroundColor: t.preview.muted }} />
                      </div>
                    </div>
                    <div className="min-w-0">
                      <div className={cn('text-[10px] font-medium truncate', isActive ? 'text-purple-200' : 'text-white/70')}>
                        {t.name}
                      </div>
                      <div className="text-[8px] text-white/30">
                        {t.mode} {t.hidden ? '(internal)' : ''}
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Quick CSS vars */}
          <div>
            <div className="text-[10px] text-white/40 uppercase tracking-wider mb-1.5">CSS Vars</div>
            <div className="grid grid-cols-4 gap-1">
              {['--background', '--foreground', '--card', '--primary', '--secondary', '--muted', '--border', '--accent'].map((v) => (
                <div key={v} className="flex flex-col items-center gap-0.5">
                  <div
                    className="size-5 rounded border border-white/20"
                    style={{ backgroundColor: `var(${v})` }}
                  />
                  <span className="text-[7px] text-white/30 truncate w-full text-center">
                    {v.replace('--', '')}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
