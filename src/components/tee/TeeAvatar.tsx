'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import Script from 'next/script'

// ============================================================================
// Types
// ============================================================================

interface TeeAvatarProps {
  /** URL to the skin image */
  skinUrl?: string
  /** Body color in Teeworlds code format */
  bodyColor?: number
  /** Feet color in Teeworlds code format */
  feetColor?: number
  /** Size preset */
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl'
  /** Enable cursor tracking for eyes */
  lookAtCursor?: boolean
  /** Custom fallback skin URL */
  fallbackSkin?: string
  /** Additional CSS classes */
  className?: string
  /** Use custom colors (if false, uses skin default colors) */
  useCustomColors?: boolean
}

// ============================================================================
// Constants
// ============================================================================

const SIZES = {
  xs: 24,
  sm: 32,
  md: 48,
  lg: 64,
  xl: 96,
  '2xl': 128,
} as const

const DEFAULT_SKIN = 'https://ddnet.org/skins/skin/default.png'

// TeeAssembler global type
interface TeeOptions {
  container: HTMLElement
  imageLink: string
  bodyColor?: number
  feetColor?: number
  colorFormat?: 'code' | 'rgb' | 'hsl'
}

interface TeeInstance {
  lookAtCursor: () => void
  unbindContainer: (clear?: boolean) => void
  setBodyColor: (color: number) => void
  setFeetColor: (color: number) => void
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
  const [scriptLoaded, setScriptLoaded] = useState(false)
  const [error, setError] = useState(false)

  const pixelSize = SIZES[size]
  const currentSkinUrl = error ? fallbackSkin : (skinUrl || fallbackSkin)

  const initTee = useCallback(() => {
    if (!containerRef.current || !window.TeeAssembler) return

    // Cleanup previous instance
    if (teeRef.current) {
      try {
        teeRef.current.unbindContainer(true)
      } catch {
        // Ignore cleanup errors
      }
      teeRef.current = null
    }

    try {
      const options: TeeOptions = {
        container: containerRef.current,
        imageLink: currentSkinUrl,
        colorFormat: 'code',
      }

      // Only add colors if using custom colors
      if (useCustomColors && (bodyColor !== 0 || feetColor !== 0)) {
        options.bodyColor = bodyColor
        options.feetColor = feetColor
      }

      const tee = new window.TeeAssembler.Tee(options)
      teeRef.current = tee

      if (lookAtCursor) {
        tee.lookAtCursor()
      }
    } catch (e) {
      console.error('[TeeAvatar] Failed to initialize:', e)
      if (!error) {
        setError(true)
      }
    }
  }, [currentSkinUrl, bodyColor, feetColor, lookAtCursor, useCustomColors, error])

  // Initialize when script loads or dependencies change
  useEffect(() => {
    if (scriptLoaded) {
      initTee()
    }

    return () => {
      if (teeRef.current) {
        try {
          teeRef.current.unbindContainer(true)
        } catch {
          // Ignore cleanup errors
        }
        teeRef.current = null
      }
    }
  }, [scriptLoaded, initTee])

  // Check if script is already loaded
  useEffect(() => {
    if (window.TeeAssembler) {
      setScriptLoaded(true)
    }
  }, [])

  return (
    <>
      <Script
        src="/js/teeassembler.min.js"
        onLoad={() => setScriptLoaded(true)}
        strategy="lazyOnload"
      />
      <div
        ref={containerRef}
        className={`tee-avatar inline-flex items-center justify-center ${className}`}
        style={{
          width: pixelSize,
          height: pixelSize,
          minWidth: pixelSize,
          minHeight: pixelSize,
        }}
        aria-label="Tee character avatar"
      />
    </>
  )
}

// ============================================================================
// Helper Components
// ============================================================================

interface TeeAvatarWithFallbackProps extends TeeAvatarProps {
  /** Show a placeholder while loading */
  showPlaceholder?: boolean
}

/**
 * TeeAvatar with built-in loading placeholder
 */
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
        className={`tee-avatar-placeholder rounded-full bg-muted animate-pulse ${props.className || ''}`}
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

/**
 * Convert HSL to Teeworlds color code
 * @param h - Hue (0-360)
 * @param s - Saturation (0-100)
 * @param l - Lightness (0-100)
 */
export function hslToTwCode(h: number, s: number, l: number): number {
  const twH = Math.floor((h / 360) * 255)
  const twS = Math.floor((s / 100) * 255)
  const twL = Math.floor((l / 100) * 255)
  return (twH << 16) | (twS << 8) | twL
}

/**
 * Convert Teeworlds color code to HSL
 * @param code - Teeworlds color code
 */
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

/**
 * Get skin URL from DDNet skins database
 * @param skinName - Name of the skin
 */
export function getDDNetSkinUrl(skinName: string): string {
  return `https://ddnet.org/skins/skin/${encodeURIComponent(skinName)}.png`
}

// Default export
export default TeeAvatar
