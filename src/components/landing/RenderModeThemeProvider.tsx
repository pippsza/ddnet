'use client'

import { useRenderModeTheme } from '@/hooks/useRenderModeTheme'

/**
 * Client component wrapper that syncs render mode with theme.
 * Drop into any layout to enable theme lock when map background is active.
 */
export function RenderModeThemeProvider() {
  useRenderModeTheme()
  return null
}
