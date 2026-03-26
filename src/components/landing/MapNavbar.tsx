'use client'

import { useState, useEffect } from 'react'
import { useScroll, motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import { Grid3x3, Menu, X, Globe } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useTranslations } from 'next-intl'
import { locales as allLocales, type Locale } from '@/i18n/config'
import { setUserLocale } from '@/services/locale'
import { useRouter, usePathname } from 'next/navigation'
import { ConditionalThemeToggle } from '@/components/theme/ConditionalThemeToggle'

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

const LOCALE_LABELS: Record<string, string> = {
  en: 'EN', ru: 'RU', uk: 'UA', de: 'DE', tr: 'TR', zh: '中文',
}

export function MapNavbar({ items, scrollMultiplier, isLoggedIn, locale, brandName = 'DDashBoard' }: MapNavbarProps) {
  const t = useTranslations('home')
  const router = useRouter()
  const pathname = usePathname()
  const { scrollYProgress } = useScroll()
  const [progress, setProgress] = useState(0)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const [localeOpen, setLocaleOpen] = useState(false)
  const [localeTransition, setLocaleTransition] = useState(false)
  const [mapActive, setMapActive] = useState(true)

  useEffect(() => {
    const check = () => {
      const mode = localStorage.getItem('landing-render-mode') || 'quality'
      setMapActive(mode !== 'performance')
    }
    check()
    window.addEventListener('render-mode-change', check)
    window.addEventListener('storage', check)
    return () => {
      window.removeEventListener('render-mode-change', check)
      window.removeEventListener('storage', check)
    }
  }, [])

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [mobileOpen])

  const handleLocaleChange = async (newLocale: string) => {
    if (newLocale === locale) { setLocaleOpen(false); return }
    setLocaleOpen(false)
    setMobileOpen(false)
    // Fade out
    setLocaleTransition(true)
    await setUserLocale(newLocale as Locale)
    // Navigate after fade completes
    setTimeout(() => {
      const localePrefix = allLocales.find((l) => pathname === `/${l}` || pathname.startsWith(`/${l}/`))
      if (localePrefix) {
        router.push(`/${newLocale}${pathname.replace(`/${localePrefix}`, '') || ''}`)
      } else {
        router.refresh()
      }
    }, 400)
  }

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
          ? mapActive
            ? 'bg-black/60 backdrop-blur-xl border-b border-white/10'
            : 'bg-background/80 backdrop-blur-xl border-b'
          : 'bg-transparent',
      )}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex justify-between items-center">
        {/* Brand */}
        <button onClick={() => scrollTo(0)} className="flex items-center gap-2 group">
          <Grid3x3 className={cn('size-6 group-hover:scale-110 transition-transform', mapActive ? 'text-[#10b981]' : 'text-primary')} />
          <span className={cn('text-lg font-bold', mapActive ? 'text-white' : 'text-foreground')}>{brandName}</span>
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
                  ? mapActive ? 'text-white bg-white/15' : 'text-foreground bg-muted'
                  : mapActive ? 'text-white/60 hover:text-white hover:bg-white/10' : 'text-muted-foreground hover:text-foreground hover:bg-muted',
              )}
            >
              {item.label}
            </button>
          ))}

          {/* Locale switcher */}
          <div className="relative ml-2">
            <button
              onClick={() => setLocaleOpen(!localeOpen)}
              className={cn('flex items-center gap-1 px-2 py-1.5 rounded-full text-xs transition-all', mapActive ? 'text-white/60 hover:text-white hover:bg-white/10' : 'text-muted-foreground hover:text-foreground hover:bg-muted')}
            >
              <Globe className="size-3.5" />
              {LOCALE_LABELS[locale] || locale.toUpperCase()}
            </button>
            {localeOpen && (
              <div className="absolute right-0 top-full mt-1 bg-black/80 backdrop-blur-xl border border-white/10 rounded-lg py-1 min-w-[100px] z-50">
                {allLocales.map((l) => (
                  <button
                    key={l}
                    onClick={() => handleLocaleChange(l)}
                    className={cn(
                      'block w-full text-left px-3 py-1.5 text-xs transition-colors',
                      l === locale ? 'text-white bg-white/10' : 'text-white/60 hover:text-white hover:bg-white/5',
                    )}
                  >
                    {LOCALE_LABELS[l] || l.toUpperCase()}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* About link */}
          <Link
            href={`/${locale}/about`}
            className={cn('px-3 py-1.5 rounded-full text-sm transition-all', mapActive ? 'text-white/50 hover:text-white hover:bg-white/10' : 'text-muted-foreground hover:text-foreground hover:bg-muted')}
          >
            About
          </Link>

          <ConditionalThemeToggle start="top-right" variant="circle-blur" />

          <div className="ml-2 flex gap-2">
            {isLoggedIn ? (
              <Button size="sm" asChild className="bg-[#1a6b3c]! text-[#d4f4e0]! hover:bg-[#15803d]!">
                <Link href="/app">Open App</Link>
              </Button>
            ) : (
              <>
                <Button size="sm" variant="ghost" className={mapActive ? 'text-white/80 hover:text-white' : ''} asChild>
                  <Link href="/login">{t('nav.login')}</Link>
                </Button>
                {mapActive ? (
                  <Button size="sm" asChild className="bg-[#1a6b3c]! text-[#d4f4e0]! hover:bg-[#15803d]!">
                    <Link href="/register">{t('nav.signup')}</Link>
                  </Button>
                ) : (
                  <Button size="sm" asChild>
                    <Link href="/register">{t('nav.signup')}</Link>
                  </Button>
                )}
              </>
            )}
          </div>
        </div>

        {/* Mobile menu button */}
        <button
          className={cn('md:hidden p-2', mapActive ? 'text-white' : 'text-foreground')}
          onClick={() => setMobileOpen(!mobileOpen)}
        >
          {mobileOpen ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
      </div>

      {/* Mobile menu */}
      <AnimatePresence>
        {mobileOpen && (
        <>
        {/* Backdrop — tap to close */}
        <motion.div
          className="fixed inset-0 z-30 bg-black/50 md:hidden"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={() => setMobileOpen(false)}
        />
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
          className="md:hidden relative z-40"
        >
        <div className={cn('backdrop-blur-2xl border-t px-4 py-4 space-y-1', mapActive ? 'border-white/10' : 'border-border bg-background/80')}>
          {items.map((item) => (
            <button
              key={item.label}
              onClick={() => scrollTo(item.scrollTarget)}
              className={cn('block w-full text-left px-4 py-2.5 rounded-lg text-sm', mapActive ? 'text-white/80 hover:text-white hover:bg-white/10' : 'text-foreground hover:bg-muted')}
            >
              {item.label}
            </button>
          ))}
          {/* About link */}
          <Link
            href={`/${locale}/about`}
            onClick={() => setMobileOpen(false)}
            className="block w-full text-left px-4 py-2.5 text-white/80 hover:text-white hover:bg-white/10 rounded-lg text-sm"
          >
            About
          </Link>
          {/* Mobile locale switcher */}
          <div className="pt-3 border-t border-white/10 flex flex-wrap gap-1.5 mb-3">
            {allLocales.map((l) => (
              <button
                key={l}
                onClick={() => handleLocaleChange(l)}
                className={cn(
                  'px-2.5 py-1 rounded-full text-xs transition-colors',
                  l === locale ? 'bg-white/15 text-white' : 'text-white/40 hover:text-white/70',
                )}
              >
                {LOCALE_LABELS[l]}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            {isLoggedIn ? (
              <Button size="sm" className="w-full bg-[#1a6b3c]! text-[#d4f4e0]! hover:bg-[#15803d]!" asChild>
                <Link href="/app">Open App</Link>
              </Button>
            ) : (
              <>
                <Button size="sm" variant="ghost" className="flex-1 text-white/80" asChild>
                  <Link href="/login">{t('nav.login')}</Link>
                </Button>
                <Button size="sm" className="flex-1 bg-[#1a6b3c]! text-[#d4f4e0]! hover:bg-[#15803d]!" asChild>
                  <Link href="/register">{t('nav.signup')}</Link>
                </Button>
              </>
            )}
          </div>
        </div>
        </motion.div>
        </>
        )}
      </AnimatePresence>
      {/* Locale change fade overlay */}
      {localeTransition && (
        <div
          className="fixed inset-0 z-100 bg-linear-to-b from-[#2a1f4e] via-[#1a1040] to-[#0a0f14] animate-[fade-in_0.4s_ease_forwards]"
        />
      )}
    </nav>
  )
}
