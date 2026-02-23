'use client'

import { useEffect, useRef, useState, useCallback } from 'react'

// ============================================================================
// Types
// ============================================================================

interface TeeAvatarProps {
  skinUrl?: string
  bodyColor?: number
  feetColor?: number
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl'
  lookAtCursor?: boolean
  fallbackSkin?: string
  className?: string
  useCustomColors?: boolean
}

interface TeeOptions {
  container: HTMLElement
  imageLink: string
  bodyColor?: number
  feetColor?: number
  colorFormat?: 'code' | 'rgb' | 'hsl'
}

interface TeeInstance {
  api: {
    functions: {
      lookAtCursor: () => void
      dontLookAtCursor: () => void
      unbindContainer: (clear?: boolean) => void
    }
  }
}

interface TeeAssemblerGlobal {
  Tee: new (options: TeeOptions) => TeeInstance
}

declare global {
  interface Window {
    TeeAssembler?: TeeAssemblerGlobal
  }
}

// ============================================================================
// Constants
// ============================================================================

const SIZES = {
  xs: 40,
  sm: 56,
  md: 80,
  lg: 112,
  xl: 160,
  '2xl': 210,
} as const

const TEE_BASE_SIZE = 96 // TeeAssembler renders at 96em with font-size: 1px

const DEFAULT_SKIN = 'https://ddnet.org/skins/skin/default.png'

// ============================================================================
// Shared script loader — loads the script exactly once for all instances
// ============================================================================

let loadPromise: Promise<void> | null = null

function ensureTeeAssemblerLoaded(): Promise<void> {
  if (window.TeeAssembler) return Promise.resolve()

  if (loadPromise) return loadPromise

  loadPromise = new Promise<void>((resolve, reject) => {
    const script = document.createElement('script')
    script.src = '/js/teeassembler.min.js'
    script.async = true
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('Failed to load TeeAssembler'))
    document.head.appendChild(script)
  })

  return loadPromise
}

// ============================================================================
// Component
// ============================================================================

export function TeeAvatar({
  skinUrl,
  bodyColor = 0,
  feetColor = 0,
  size = 'md',
  lookAtCursor = false,
  fallbackSkin = DEFAULT_SKIN,
  className = '',
  useCustomColors = true,
}: TeeAvatarProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const teeRef = useRef<TeeInstance | null>(null)
  const [ready, setReady] = useState(false)
  const [error, setError] = useState(false)

  const pixelSize = SIZES[size]
  const fontSize = pixelSize / TEE_BASE_SIZE // scale via font-size
  const currentSkinUrl = error ? fallbackSkin : (skinUrl || fallbackSkin)

  // Load script once, then mark ready
  useEffect(() => {
    let cancelled = false
    ensureTeeAssemblerLoaded()
      .then(() => {
        if (!cancelled) setReady(true)
      })
      .catch(() => {
        console.error('[TeeAvatar] Failed to load TeeAssembler script')
      })
    return () => {
      cancelled = true
    }
  }, [])

  const initTee = useCallback(() => {
    if (!containerRef.current || !window.TeeAssembler) return

    // Cleanup previous instance
    if (teeRef.current) {
      try {
        teeRef.current.api.functions.dontLookAtCursor()
      } catch {
        // Ignore cleanup errors
      }
      teeRef.current = null
    }

    // Clear container children from previous render
    containerRef.current.replaceChildren()

    try {
      const options: TeeOptions = {
        container: containerRef.current,
        imageLink: currentSkinUrl,
        colorFormat: 'code',
      }

      if (useCustomColors && (bodyColor !== 0 || feetColor !== 0)) {
        options.bodyColor = bodyColor
        options.feetColor = feetColor
      }

      const tee = new window.TeeAssembler.Tee(options)
      teeRef.current = tee

      if (lookAtCursor) {
        tee.api.functions.lookAtCursor()
      }
    } catch (e) {
      console.error('[TeeAvatar] Failed to initialize:', e)
      if (!error) setError(true)
    }
  }, [currentSkinUrl, bodyColor, feetColor, lookAtCursor, useCustomColors, error])

  // Initialize when script is ready or dependencies change
  useEffect(() => {
    if (ready) {
      initTee()
    }

    return () => {
      if (teeRef.current) {
        try {
          teeRef.current.api.functions.dontLookAtCursor()
        } catch {
          // Ignore cleanup errors
        }
        teeRef.current = null
      }
    }
  }, [ready, initTee])

  return (
    <div
      ref={containerRef}
      className={`teeassembler-tee ${className}`}
      style={{ fontSize: `${fontSize}px` }}
      aria-label="Tee character avatar"
    />
  )
}

// ============================================================================
// Helper Components
// ============================================================================

interface TeeAvatarWithFallbackProps extends TeeAvatarProps {
  showPlaceholder?: boolean
}

export function TeeAvatarWithFallback({
  showPlaceholder = true,
  ...props
}: TeeAvatarWithFallbackProps) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted && showPlaceholder) {
    const size = SIZES[props.size || 'md']
    return (
      <div
        className={`rounded-full bg-muted animate-pulse ${props.className || ''}`}
        style={{
          width: size,
          height: size,
          minWidth: size,
          minHeight: size,
        }}
      />
    )
  }

  return <TeeAvatar {...props} />
}

// ============================================================================
// Utility Functions
// ============================================================================

export function hslToTwCode(h: number, s: number, l: number): number {
  const twH = Math.floor((h / 360) * 255)
  const twS = Math.floor((s / 100) * 255)
  const twL = Math.floor((l / 100) * 255)
  return (twH << 16) | (twS << 8) | twL
}

export function twCodeToHsl(code: number): { h: number; s: number; l: number } {
  const twH = (code >> 16) & 0xff
  const twS = (code >> 8) & 0xff
  const twL = code & 0xff
  return {
    h: Math.floor((twH / 255) * 360),
    s: Math.floor((twS / 255) * 100),
    l: Math.floor((twL / 255) * 100),
  }
}

export function getDDNetSkinUrl(skinName: string): string {
  return `https://ddnet.org/skins/skin/${encodeURIComponent(skinName)}.png`
}

export default TeeAvatar
