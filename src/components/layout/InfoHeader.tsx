'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import { Grid3x3, Globe, Menu, X } from 'lucide-react'
import { useLocale } from 'next-intl'
import { useRouter, usePathname } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { locales as allLocales, type Locale } from '@/i18n/config'
import { setUserLocale } from '@/services/locale'
import { useRenderMode } from '@/hooks/useRenderMode'
import { ConditionalThemeToggle } from '@/components/theme/ConditionalThemeToggle'
import { RenderModeToggle } from '@/components/landing/RenderModeToggle'

const LOCALE_LABELS: Record<string, string> = {
  en: 'EN', ru: 'RU', uk: 'UA', de: 'DE', tr: 'TR', zh: '中文',
}

interface InfoHeaderProps {
  isLoggedIn?: boolean
}

export function InfoHeader({ isLoggedIn }: InfoHeaderProps) {
  const locale = useLocale()
  const router = useRouter()
  const pathname = usePathname()
  const [localeOpen, setLocaleOpen] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const { mapActive } = useRenderMode()

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [mobileOpen])

  const handleLocaleChange = async (newLocale: string) => {
    setLocaleOpen(false)
    setMobileOpen(false)
    await setUserLocale(newLocale as Locale)
    const localePrefix = allLocales.find((l) => pathname === `/${l}` || pathname.startsWith(`/${l}/`))
    if (localePrefix) {
      router.push(`/${newLocale}${pathname.replace(`/${localePrefix}`, '') || ''}`)
    } else {
      router.refresh()
    }
  }

  const navLinks = [
    { href: `/${locale}`, label: 'Home' },
    { href: `/${locale}/about`, label: 'About' },
    { href: `/${locale}/rules`, label: 'Rules' },
    { href: `/${locale}/terms`, label: 'Terms' },
    { href: `/${locale}/privacy`, label: 'Privacy' },
  ]

  const isActive = (href: string) => pathname === href

  return (
    <header className={cn(
      'sticky top-0 z-40 border-b backdrop-blur-xl',
      mapActive
        ? 'bg-black/60 border-white/10'
        : 'bg-background/80 border-border',
    )}>
      <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between gap-2">
        {/* Brand */}
        <Link
          href={`/${locale}`}
          className="flex items-center gap-1.5 hover:opacity-80 transition-opacity shrink-0"
        >
          <Grid3x3 className={cn('size-5', mapActive ? 'text-accent' : 'text-primary')} />
          <span className={cn('font-bold', mapActive ? 'text-white' : 'text-foreground')}>{`DDashBoard`}</span>
        </Link>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-1">
          <nav className="flex gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  'px-3 py-1.5 rounded-full text-sm transition-all',
                  isActive(link.href)
                    ? mapActive ? 'text-white bg-white/15' : 'text-foreground bg-muted'
                    : mapActive ? 'text-white/50 hover:text-white hover:bg-white/10' : 'text-muted-foreground hover:text-foreground hover:bg-muted',
                )}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* Locale switcher */}
          <div className="relative ml-2">
            <button
              onClick={() => setLocaleOpen(!localeOpen)}
              className={cn(
                'flex items-center gap-1 px-2 py-1.5 rounded-full text-xs transition-all',
                mapActive ? 'text-white/60 hover:text-white hover:bg-white/10' : 'text-muted-foreground hover:text-foreground hover:bg-muted',
              )}
            >
              <Globe className="size-3.5" />
              {LOCALE_LABELS[locale] || locale.toUpperCase()}
            </button>
            {localeOpen && (
              <div className={cn(
                'absolute right-0 top-full mt-1 backdrop-blur-xl rounded-lg py-1 min-w-[100px] z-50',
                mapActive ? 'bg-black/80 border border-white/10' : 'bg-popover border border-border',
              )}>
                {allLocales.map((l) => (
                  <button
                    key={l}
                    onClick={() => handleLocaleChange(l)}
                    className={cn(
                      'block w-full text-left px-3 py-1.5 text-xs transition-colors',
                      l === locale
                        ? mapActive ? 'text-white bg-white/10' : 'text-foreground bg-accent'
                        : mapActive ? 'text-white/60 hover:text-white hover:bg-white/5' : 'text-muted-foreground hover:text-foreground hover:bg-accent',
                    )}
                  >
                    {LOCALE_LABELS[l] || l.toUpperCase()}
                  </button>
                ))}
              </div>
            )}
          </div>

          <ConditionalThemeToggle start="top-right" variant="circle-blur" />
          <RenderModeToggle />

          {/* Auth */}
          <div className="ml-2 flex gap-2">
            {isLoggedIn ? (
              mapActive ? (
                <Button size="sm" asChild className="bg-[#1a6b3c]! text-[#d4f4e0]! hover:bg-[#15803d]!">
                  <Link href="/app">Open App</Link>
                </Button>
              ) : (
                <Button size="sm" asChild>
                  <Link href="/app">Open App</Link>
                </Button>
              )
            ) : (
              <>
                <Button size="sm" variant="ghost" className={mapActive ? 'text-white/80 hover:text-white' : ''} asChild>
                  <Link href="/login">Log in</Link>
                </Button>
                {mapActive ? (
                  <Button size="sm" asChild className="bg-[#1a6b3c]! text-[#d4f4e0]! hover:bg-[#15803d]!">
                    <Link href="/register">Sign up</Link>
                  </Button>
                ) : (
                  <Button size="sm" asChild>
                    <Link href="/register">Sign up</Link>
                  </Button>
                )}
              </>
            )}
          </div>
        </div>

        {/* Mobile menu button */}
        <button className={cn('md:hidden p-2', mapActive ? 'text-white' : 'text-foreground')} onClick={() => setMobileOpen(!mobileOpen)}>
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
              className="md:hidden relative z-40"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
            >
              <div className={cn(
                'backdrop-blur-2xl border-t px-4 py-4 space-y-1',
                mapActive ? 'border-white/10' : 'border-border bg-background/80',
              )}>
                {navLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setMobileOpen(false)}
                    className={cn(
                      'block w-full text-left px-4 py-2.5 rounded-lg text-sm transition-colors',
                      isActive(link.href)
                        ? mapActive ? 'text-white bg-white/10' : 'text-foreground bg-muted'
                        : mapActive ? 'text-white/80 hover:text-white hover:bg-white/10' : 'text-foreground hover:bg-muted',
                    )}
                  >
                    {link.label}
                  </Link>
                ))}
                {/* Mobile locale */}
                <div className={cn('pt-3 border-t flex flex-wrap gap-1.5 mb-3', mapActive ? 'border-white/10' : 'border-border')}>
                  {allLocales.map((l) => (
                    <button
                      key={l}
                      onClick={() => handleLocaleChange(l)}
                      className={cn(
                        'px-2.5 py-1 rounded-full text-xs transition-colors',
                        l === locale
                          ? mapActive ? 'bg-white/15 text-white' : 'bg-muted text-foreground'
                          : mapActive ? 'text-white/40 hover:text-white/70' : 'text-muted-foreground hover:text-foreground',
                      )}
                    >
                      {LOCALE_LABELS[l]}
                    </button>
                  ))}
                </div>
                {/* Mobile auth */}
                <div className="flex gap-2">
                  {isLoggedIn ? (
                    mapActive ? (
                      <Button size="sm" className="w-full bg-[#1a6b3c]! text-[#d4f4e0]! hover:bg-[#15803d]!" asChild>
                        <Link href="/app">Open App</Link>
                      </Button>
                    ) : (
                      <Button size="sm" className="w-full" asChild>
                        <Link href="/app">Open App</Link>
                      </Button>
                    )
                  ) : (
                    <>
                      <Button size="sm" variant="ghost" className={cn('flex-1', mapActive ? 'text-white/80' : '')} asChild>
                        <Link href="/login">Log in</Link>
                      </Button>
                      {mapActive ? (
                        <Button size="sm" className="flex-1 bg-[#1a6b3c]! text-[#d4f4e0]! hover:bg-[#15803d]!" asChild>
                          <Link href="/register">Sign up</Link>
                        </Button>
                      ) : (
                        <Button size="sm" className="flex-1" asChild>
                          <Link href="/register">Sign up</Link>
                        </Button>
                      )}
                    </>
                  )}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </header>
  )
}
