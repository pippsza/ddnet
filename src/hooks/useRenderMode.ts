'use client'

import { useContext } from 'react'
import { RenderModeContext, type RenderModeContextValue } from '@/context/RenderModeContext'

export function useRenderMode(): RenderModeContextValue {
  const ctx = useContext(RenderModeContext)
  if (!ctx) {
    throw new Error('useRenderMode must be used within a RenderModeProvider')
  }
  return ctx
}

export type { RenderMode } from '@/context/RenderModeContext'
