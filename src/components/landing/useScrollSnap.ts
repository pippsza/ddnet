'use client'

import { useEffect, useRef } from 'react'

interface SnapPoint {
  progress: number
}

/**
 * Scroll-snap to nearest section when user stops scrolling near a snap point.
 * Works with scroll-driven camera systems (scrollYProgress 0→1).
 *
 * @param points — array of { progress } values to snap to (0–1)
 * @param threshold — how close (in progress units) to trigger snap (default 0.03)
 * @param debounceMs — wait time after last scroll event (default 150ms)
 */
export function useScrollSnap(
  points: SnapPoint[],
  { threshold = 0.03, debounceMs = 150 }: { threshold?: number; debounceMs?: number } = {},
) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const snappingRef = useRef(false)

  useEffect(() => {
    if (points.length === 0) return

    const getProgress = () => {
      const scrollH = document.documentElement.scrollHeight - window.innerHeight
      return scrollH > 0 ? window.scrollY / scrollH : 0
    }

    const snapToNearest = () => {
      if (snappingRef.current) return
      const current = getProgress()

      // Find nearest snap point
      let nearest = points[0]
      let minDist = Math.abs(current - nearest.progress)
      for (const p of points) {
        const dist = Math.abs(current - p.progress)
        if (dist < minDist) {
          nearest = p
          minDist = dist
        }
      }

      // Only snap if within threshold
      if (minDist > threshold || minDist < 0.001) return

      snappingRef.current = true
      const scrollH = document.documentElement.scrollHeight - window.innerHeight
      const targetY = nearest.progress * scrollH

      window.scrollTo({ top: targetY, behavior: 'smooth' })

      // Release snap lock after animation
      setTimeout(() => { snappingRef.current = false }, 600)
    }

    const onScroll = () => {
      if (snappingRef.current) return
      if (timerRef.current) clearTimeout(timerRef.current)
      timerRef.current = setTimeout(snapToNearest, debounceMs)
    }

    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', onScroll)
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [points, threshold, debounceMs])
}
