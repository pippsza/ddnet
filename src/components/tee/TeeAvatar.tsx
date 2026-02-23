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
  mirrored?: boolean
}

interface TeeOptions {
  container?: HTMLElement
  imageLink: string
  bodyColor?: number | string
  feetColor?: number | string
  colorFormat?: 'code' | 'rgb' | 'hsl'
}

interface TeeInstance {
  api: {
    functions: {
      lookAtCursor: () => void
      dontLookAtCursor: () => void
      unbindContainer: (clear?: boolean) => void
      setContainer: (el: HTMLElement) => Promise<void>
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

const DEFAULT_SKIN = '/ddnet-skins/skin/default.png'
const isDev = process.env.NODE_ENV === 'development'

// ============================================================================
// Shared script loader — loads the script exactly once for all instances
// ============================================================================

let loadPromise: Promise<void> | null = null

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = src
    script.async = true
    script.onload = () => resolve()
    script.onerror = () => reject(new Error(`Failed to load ${src}`))
    document.head.appendChild(script)
  })
}

function ensureTeeAssemblerLoaded(): Promise<void> {
  if (window.TeeAssembler) return Promise.resolve()

  if (loadPromise) return loadPromise

  // color.js must load first — it defines globals (COLOR_FORMAT, COLOR_MODE, etc.)
  // that TeeAssembler.js references
  loadPromise = loadScript('/js/teeassembler-color.min.js').then(() =>
    loadScript('/js/teeassembler.min.js'),
  )

  return loadPromise
}

// ============================================================================
// Image resolution — try normal path, then community, then fallback
// ============================================================================

const resolvedSkinCache = new Map<string, string>()

async function probeImage(url: string): Promise<boolean> {
  try {
    const res = await fetch(url, { method: 'HEAD' })
    return res.ok
  } catch {
    return false
  }
}

/** Try normal → community → fallback. Returns the first URL that loads. */
async function resolveSkinUrl(skinUrl: string, fallback: string): Promise<string> {
  const cached = resolvedSkinCache.get(skinUrl)
  if (cached) return cached

  // If it's already the fallback or an absolute URL (not a ddnet-skins proxy path), just probe it
  if (skinUrl === fallback || !skinUrl.startsWith('/ddnet-skins/skin/')) {
    const ok = await probeImage(skinUrl)
    const result = ok ? skinUrl : fallback
    resolvedSkinCache.set(skinUrl, result)
    return result
  }

  // Try normal path first (e.g. /ddnet-skins/skin/name.png)
  if (await probeImage(skinUrl)) {
    resolvedSkinCache.set(skinUrl, skinUrl)
    return skinUrl
  }

  // Try community path (e.g. /ddnet-skins/skin/community/name.png)
  const filename = skinUrl.split('/').pop() // "name.png"
  const communityUrl = `/ddnet-skins/skin/community/${filename}`
  if (await probeImage(communityUrl)) {
    resolvedSkinCache.set(skinUrl, communityUrl)
    if (isDev) console.log('[TeeAvatar] resolved community skin:', communityUrl)
    return communityUrl
  }

  // Both failed — use fallback
  if (isDev) console.warn('[TeeAvatar] skin not found (normal + community):', skinUrl)
  resolvedSkinCache.set(skinUrl, fallback)
  return fallback
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
  mirrored = false,
}: TeeAvatarProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const teeRef = useRef<TeeInstance | null>(null)
  const [ready, setReady] = useState(false)
  const [validatedUrl, setValidatedUrl] = useState<string | null>(null)

  const pixelSize = SIZES[size]
  const fontSize = pixelSize / TEE_BASE_SIZE // scale via font-size

  if (isDev) {
    console.log('[TeeAvatar] render', {
      skinUrl,
      validatedUrl,
      bodyColor,
      feetColor,
      size,
    })
  }

  // Load script once, then mark ready
  useEffect(() => {
    let cancelled = false
    if (isDev) console.log('[TeeAvatar] loading TeeAssembler script...')
    ensureTeeAssemblerLoaded()
      .then(() => {
        if (isDev) console.log('[TeeAvatar] TeeAssembler script loaded')
        if (!cancelled) setReady(true)
      })
      .catch((err) => {
        console.error('[TeeAvatar] Failed to load TeeAssembler script', err)
      })
    return () => {
      cancelled = true
    }
  }, [])

  // Resolve skin URL: try normal → community → fallback
  useEffect(() => {
    let cancelled = false
    const targetUrl = skinUrl || fallbackSkin

    resolveSkinUrl(targetUrl, fallbackSkin).then((resolved) => {
      if (!cancelled) setValidatedUrl(resolved)
    })

    return () => {
      cancelled = true
    }
  }, [skinUrl, fallbackSkin])

  const createTee = useCallback(
    async (imageLink: string) => {
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

      containerRef.current.replaceChildren()
      containerRef.current.style.transform = ''

      try {
        const options: TeeOptions = {
          imageLink,
          colorFormat: 'code',
        }

        if (useCustomColors && (bodyColor !== 0 || feetColor !== 0)) {
          options.bodyColor = String(bodyColor)
          options.feetColor = String(feetColor)
        }

        if (isDev) {
          console.log('[TeeAvatar] creating TeeAssembler instance', {
            imageLink,
            bodyColor: options.bodyColor,
            feetColor: options.feetColor,
          })
        }

        // Don't pass container in constructor when mirrored — setContainer is async
        // (loads image, then calculates eye positions via getBoundingClientRect).
        // If scaleX(-1) is applied before that calculation, the flipped coordinates
        // cause the library to counteract the flip for the eyes.
        if (mirrored) {
          const tee = new window.TeeAssembler.Tee(options)
          teeRef.current = tee
          // Await the full init (image load + eye positioning) with no transforms
          await tee.api.functions.setContainer(containerRef.current!)
          // NOW safe to flip — all getBoundingClientRect calculations are done
          if (containerRef.current) {
            containerRef.current.style.transform = 'scaleX(-1)'
          }
        } else {
          options.container = containerRef.current
          const tee = new window.TeeAssembler.Tee(options)
          teeRef.current = tee
          if (lookAtCursor) {
            tee.api.functions.lookAtCursor()
          }
        }
      } catch (e) {
        console.error('[TeeAvatar] Failed to initialize:', e, { imageLink })
      }
    },
    [bodyColor, feetColor, lookAtCursor, mirrored, useCustomColors],
  )

  // Initialize when script is ready AND image is validated
  useEffect(() => {
    if (ready && validatedUrl) {
      createTee(validatedUrl)
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
  }, [ready, validatedUrl, createTee])

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
  return `/ddnet-skins/skin/${encodeURIComponent(skinName)}.png`
}

export default TeeAvatar
