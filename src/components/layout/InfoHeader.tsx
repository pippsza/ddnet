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
    <header className="sticky top-0 z-40 border-b border-white/10 bg-black/60 backdrop-blur-xl">
      <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between gap-2">
        {/* Brand */}
        <Link
          href={`/${locale}`}
          className="flex items-center gap-1.5 hover:opacity-80 transition-opacity shrink-0"
        >
          <Grid3x3 className="size-5 text-[#10b981]" />
          <span className="font-bold text-white">DDashBoard</span>
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
                    ? 'text-white bg-white/15'
                    : 'text-white/50 hover:text-white hover:bg-white/10',
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
              className="flex items-center gap-1 px-2 py-1.5 rounded-full text-white/60 hover:text-white hover:bg-white/10 text-xs transition-all"
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

          {/* Auth */}
          <div className="ml-2 flex gap-2">
            {isLoggedIn ? (
              <Button size="sm" asChild className="bg-[#1a6b3c]! text-[#d4f4e0]! hover:bg-[#15803d]!">
                <Link href="/app">Open App</Link>
              </Button>
            ) : (
              <>
                <Button size="sm" variant="ghost" className="text-white/80 hover:text-white" asChild>
                  <Link href="/login">Log in</Link>
                </Button>
                <Button size="sm" asChild className="bg-[#1a6b3c]! text-[#d4f4e0]! hover:bg-[#15803d]!">
                  <Link href="/register">Sign up</Link>
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Mobile menu button */}
        <button className="md:hidden text-white p-2" onClick={() => setMobileOpen(!mobileOpen)}>
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
              <div className="backdrop-blur-2xl border-t border-white/10 px-4 py-4 space-y-1">
                {navLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setMobileOpen(false)}
                    className={cn(
                      'block w-full text-left px-4 py-2.5 rounded-lg text-sm transition-colors',
                      isActive(link.href)
                        ? 'text-white bg-white/10'
                        : 'text-white/80 hover:text-white hover:bg-white/10',
                    )}
                  >
                    {link.label}
                  </Link>
                ))}
                {/* Mobile locale */}
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
                {/* Mobile auth */}
                <div className="flex gap-2">
                  {isLoggedIn ? (
                    <Button size="sm" className="w-full bg-[#1a6b3c]! text-[#d4f4e0]! hover:bg-[#15803d]!" asChild>
                      <Link href="/app">Open App</Link>
                    </Button>
                  ) : (
                    <>
                      <Button size="sm" variant="ghost" className="flex-1 text-white/80" asChild>
                        <Link href="/login">Log in</Link>
                      </Button>
                      <Button size="sm" className="flex-1 bg-[#1a6b3c]! text-[#d4f4e0]! hover:bg-[#15803d]!" asChild>
                        <Link href="/register">Sign up</Link>
                      </Button>
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
