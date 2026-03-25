'use client'

import { useState, useEffect } from 'react'
import { useScroll } from 'framer-motion'
import Link from 'next/link'
import { Grid3x3, Menu, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface NavItem {
  label: string
  scrollTarget: number // 0-1
}

interface MapNavbarProps {
  items: NavItem[]
  scrollMultiplier: number
  isLoggedIn: boolean
  locale: string
  brandName?: string
}

export function MapNavbar({ items, scrollMultiplier, isLoggedIn, locale, brandName = 'DDashBoard' }: MapNavbarProps) {
  const { scrollYProgress } = useScroll()
  const [progress, setProgress] = useState(0)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const unsub = scrollYProgress.on('change', (v) => {
      setProgress(v)
      setScrolled(v > 0.01)
    })
    return unsub
  }, [scrollYProgress])

  const scrollTo = (target: number) => {
    const totalHeight = document.documentElement.scrollHeight - window.innerHeight
    window.scrollTo({ top: totalHeight * target, behavior: 'smooth' })
    setMobileOpen(false)
  }

  // Find active section
  const activeIndex = items.reduce((best, item, i) => {
    if (progress >= item.scrollTarget - 0.05) return i
    return best
  }, 0)

  return (
    <nav
      className={cn(
        'fixed top-0 w-full z-50 transition-all duration-300',
        scrolled
          ? 'bg-black/60 backdrop-blur-xl border-b border-white/10'
          : 'bg-transparent',
      )}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex justify-between items-center">
        {/* Brand */}
        <button onClick={() => scrollTo(0)} className="flex items-center gap-2 group">
          <Grid3x3 className="size-6 text-primary group-hover:scale-110 transition-transform" />
          <span className="text-lg font-bold text-white">{brandName}</span>
        </button>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-1">
          {items.map((item, i) => (
            <button
              key={item.label}
              onClick={() => scrollTo(item.scrollTarget)}
              className={cn(
                'px-3 py-1.5 rounded-full text-sm transition-all',
                i === activeIndex
                  ? 'text-white bg-white/15'
                  : 'text-white/60 hover:text-white hover:bg-white/10',
              )}
            >
              {item.label}
            </button>
          ))}

          <div className="ml-3 flex gap-2">
            {isLoggedIn ? (
              <Button size="sm" asChild variant="secondary">
                <Link href="/app/dashboard">Dashboard</Link>
              </Button>
            ) : (
              <>
                <Button size="sm" variant="ghost" className="text-white/80 hover:text-white" asChild>
                  <Link href="/login">Log in</Link>
                </Button>
                <Button size="sm" asChild>
                  <Link href="/register">Sign up</Link>
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Mobile menu button */}
        <button
          className="md:hidden text-white p-2"
          onClick={() => setMobileOpen(!mobileOpen)}
        >
          {mobileOpen ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden bg-black/90 backdrop-blur-xl border-t border-white/10 px-4 py-4 space-y-1">
          {items.map((item) => (
            <button
              key={item.label}
              onClick={() => scrollTo(item.scrollTarget)}
              className="block w-full text-left px-4 py-2.5 text-white/80 hover:text-white hover:bg-white/10 rounded-lg text-sm"
            >
              {item.label}
            </button>
          ))}
          <div className="pt-3 border-t border-white/10 flex gap-2">
            {isLoggedIn ? (
              <Button size="sm" className="w-full" asChild>
                <Link href="/app/dashboard">Dashboard</Link>
              </Button>
            ) : (
              <>
                <Button size="sm" variant="ghost" className="flex-1 text-white/80" asChild>
                  <Link href="/login">Log in</Link>
                </Button>
                <Button size="sm" className="flex-1" asChild>
                  <Link href="/register">Sign up</Link>
                </Button>
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  )
}
