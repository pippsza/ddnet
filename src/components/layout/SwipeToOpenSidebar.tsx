'use client'

import { useEffect, useRef } from 'react'
import { useSidebar } from '@/components/ui/sidebar'

const EDGE_THRESHOLD = 30   // px from left edge to trigger open gesture
const MIN_SWIPE_X = 50      // minimum horizontal distance to count as swipe
const MAX_ANGLE = 1.2       // max dy/dx ratio — keeps gesture mostly horizontal

export function SwipeToOpenSidebar() {
  const { openMobile, setOpenMobile, isMobile } = useSidebar()
  const startX = useRef<number | null>(null)
  const startY = useRef<number | null>(null)

  useEffect(() => {
    if (!isMobile) return

    const onTouchStart = (e: TouchEvent) => {
      startX.current = e.touches[0].clientX
      startY.current = e.touches[0].clientY
    }

    const onTouchEnd = (e: TouchEvent) => {
      if (startX.current === null || startY.current === null) return

      const dx = e.changedTouches[0].clientX - startX.current
      const dy = e.changedTouches[0].clientY - startY.current

      startX.current = null
      startY.current = null

      // Ignore mostly-vertical swipes
      if (Math.abs(dy) > Math.abs(dx) * MAX_ANGLE) return
      if (Math.abs(dx) < MIN_SWIPE_X) return

      if (dx > 0 && (e.changedTouches[0].clientX - dx) < EDGE_THRESHOLD && !openMobile) {
        // Swipe right starting from left edge → open
        setOpenMobile(true)
      } else if (dx < 0 && openMobile) {
        // Swipe left → close
        setOpenMobile(false)
      }
    }

    document.addEventListener('touchstart', onTouchStart, { passive: true })
    document.addEventListener('touchend', onTouchEnd, { passive: true })

    return () => {
      document.removeEventListener('touchstart', onTouchStart)
      document.removeEventListener('touchend', onTouchEnd)
    }
  }, [isMobile, openMobile, setOpenMobile])

  return null
}
