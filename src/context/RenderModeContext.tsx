'use client'

import { createContext, useState, useEffect, useCallback, type ReactNode } from 'react'
import { useTheme } from 'next-themes'
import { MAP_ACTIVE_THEME } from '@/lib/themes'

export type RenderMode = 'quality' | 'medium' | 'performance'

const LS_KEY = 'landing-render-mode'
const USER_THEME_KEY = 'user-theme-before-map'

export interface RenderModeContextValue {
  renderMode: RenderMode
  mapActive: boolean
  qualityEverUsed: boolean
  changeRenderMode: (mode: RenderMode, e?: React.MouseEvent) => void
}

export const RenderModeContext = createContext<RenderModeContextValue | null>(null)

/**
 * Circle-blur View Transition animation.
 * Shared utility — replaces duplicated code in 4+ components.
 */
function withCircleTransition(applyFn: () => void, cx: string, cy: string) {
  if (!('startViewTransition' in document)) {
    applyFn()
    return
  }
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
  ;(document as any).startViewTransition(applyFn)
}

/**
 * Single source of truth for render mode (quality/medium/performance).
 * Integrates with next-themes: quality/medium → forced map-active theme,
 * performance → restores user's previously selected theme.
 */
export function RenderModeProvider({ children }: { children: ReactNode }) {
  const { theme, setTheme } = useTheme()

  const [renderMode, setRenderMode] = useState<RenderMode>(() => {
    if (typeof window === 'undefined') return 'quality'
    return (localStorage.getItem(LS_KEY) as RenderMode) || 'quality'
  })
  const [qualityEverUsed, setQualityEverUsed] = useState(() => {
    if (typeof window === 'undefined') return false
    return (localStorage.getItem(LS_KEY) || 'quality') === 'quality'
  })

  const mapActive = renderMode !== 'performance'

  // On mount: enforce correct theme based on render mode
  useEffect(() => {
    if (mapActive) {
      // Save user's current theme before overriding (if not already map-active)
      if (theme && theme !== MAP_ACTIVE_THEME) {
        localStorage.setItem(USER_THEME_KEY, theme)
      }
      setTheme(MAP_ACTIVE_THEME)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // Only on mount

  // Listen for cross-tab changes via storage event
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === LS_KEY && e.newValue) {
        const mode = e.newValue as RenderMode
        setRenderMode(mode)
        if (mode === 'quality') setQualityEverUsed(true)
        // Sync theme across tabs
        if (mode !== 'performance') {
          setTheme(MAP_ACTIVE_THEME)
        } else {
          const savedTheme = localStorage.getItem(USER_THEME_KEY) || 'default-dark'
          setTheme(savedTheme)
        }
      }
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [setTheme])

  const changeRenderMode = useCallback(
    (mode: RenderMode, e?: React.MouseEvent) => {
      if (mode === renderMode) return

      const apply = () => {
        setRenderMode(mode)
        localStorage.setItem(LS_KEY, mode)
        if (mode === 'quality') setQualityEverUsed(true)

        if (mode !== 'performance') {
          // Entering map mode: save current theme, switch to map-active
          if (theme && theme !== MAP_ACTIVE_THEME) {
            localStorage.setItem(USER_THEME_KEY, theme)
          }
          setTheme(MAP_ACTIVE_THEME)
        } else {
          // Leaving map mode: restore user's theme
          const savedTheme = localStorage.getItem(USER_THEME_KEY) || 'default-dark'
          setTheme(savedTheme)
        }
      }

      if (e) {
        const cx = ((e.clientX / window.innerWidth) * 100).toFixed(0)
        const cy = ((e.clientY / window.innerHeight) * 100).toFixed(0)
        withCircleTransition(apply, cx, cy)
      } else {
        withCircleTransition(apply, '90', '50')
      }
    },
    [renderMode, theme, setTheme],
  )

  return (
    <RenderModeContext.Provider
      value={{ renderMode, mapActive, qualityEverUsed, changeRenderMode }}
    >
      {children}
    </RenderModeContext.Provider>
  )
}
