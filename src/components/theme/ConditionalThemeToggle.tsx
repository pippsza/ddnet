'use client'

import { ThemeToggleButton, type ThemeToggleButtonProps } from './theme-toggle'
import { useRenderMode } from '@/hooks/useRenderMode'

/**
 * ThemeToggleButton that hides when map background is active (quality/medium mode).
 * Theme is locked to forest in those modes — no point showing toggle.
 */
export function ConditionalThemeToggle(props: ThemeToggleButtonProps) {
  const { mapActive } = useRenderMode()

  if (mapActive) return null

  return <ThemeToggleButton {...props} />
}
