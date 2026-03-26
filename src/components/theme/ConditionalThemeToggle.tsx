'use client'

import { useState, useEffect } from 'react'
import { ThemeToggleButton, type ThemeToggleButtonProps } from './theme-toggle'

/**
 * ThemeToggleButton that hides when map background is active (quality/medium mode).
 * Theme is locked to forest in those modes — no point showing toggle.
 */
export function ConditionalThemeToggle(props: ThemeToggleButtonProps) {
  const [hidden, setHidden] = useState(false)

  useEffect(() => {
    const check = () => {
      const mode = localStorage.getItem('landing-render-mode') || 'quality'
      setHidden(mode !== 'performance')
    }
    check()
    window.addEventListener('render-mode-change', check)
    window.addEventListener('storage', check)
    return () => {
      window.removeEventListener('render-mode-change', check)
      window.removeEventListener('storage', check)
    }
  }, [])

  if (hidden) return null

  return <ThemeToggleButton {...props} />
}
