'use client'

import { useEffect, useRef } from 'react'

/**
 * JS-based scroll snap for mobile.
 * Snaps to nearest section by finding actual DOM positions of [data-section] elements.
 * Uses scrollTo with smooth behavior after user stops scrolling.
 */
export function useMobileSnap(
  containerRef: React.RefObject<HTMLDivElement | null>,
  { debounceMs = 250, enabled = true }: { debounceMs?: number; enabled?: boolean } = {},
) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const snappingRef = useRef(false)

  useEffect(() => {
    if (!enabled) return
    const container = containerRef.current
    if (!container) return

    const getSections = () => container.querySelectorAll<HTMLElement>('[data-section]')

    const snapToNearest = () => {
      if (snappingRef.current) return
      const sections = getSections()
      if (sections.length === 0) return

      const scrollY = window.scrollY
      const viewportH = window.innerHeight
      const scrollCenter = scrollY + viewportH * 0.4 // bias toward top

      // Find nearest section
      let nearest: HTMLElement | null = null
      let minDist = Infinity
      sections.forEach((section) => {
        const rect = section.getBoundingClientRect()
        const sectionTop = scrollY + rect.top
        const dist = Math.abs(scrollCenter - sectionTop)
        if (dist < minDist) {
          minDist = dist
          nearest = section
        }
      })

      if (!nearest) return

      // Only snap if reasonably close (within half viewport)
      if (minDist > viewportH * 0.4) return

      const rect = (nearest as HTMLElement).getBoundingClientRect()
      const targetY = scrollY + rect.top - 80 // 80px offset for navbar

      // Don't snap if already very close
      if (Math.abs(scrollY - targetY) < 10) return

      snappingRef.current = true
      window.scrollTo({ top: Math.max(0, targetY), behavior: 'smooth' })

      // Release lock after smooth scroll completes
      setTimeout(() => { snappingRef.current = false }, 800)
    }

    const onScroll = () => {
      if (snappingRef.current) return
      if (timerRef.current) clearTimeout(timerRef.current)
      timerRef.current = setTimeout(snapToNearest, debounceMs)
    }

    // Also handle touch end — mobile scrolling often coasts after release
    const onTouchEnd = () => {
      if (snappingRef.current) return
      if (timerRef.current) clearTimeout(timerRef.current)
      timerRef.current = setTimeout(snapToNearest, debounceMs + 100)
    }

    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('touchend', onTouchEnd, { passive: true })
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('touchend', onTouchEnd)
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [containerRef, debounceMs, enabled])
}
