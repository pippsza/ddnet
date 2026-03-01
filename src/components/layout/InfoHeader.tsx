'use client'

import Link from 'next/link'
import { Grid3x3 } from 'lucide-react'
import { useLocale } from 'next-intl'
import { LocaleSwitcher } from '@/components/locale-switcher'
import { ThemeToggleButton } from '@/components/theme/theme-toggle'

export function InfoHeader() {
  const locale = useLocale()

  return (
    <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur-sm">
      <div className="max-w-3xl mx-auto px-4 h-14 flex items-center justify-between gap-2">
        <Link
          href={`/${locale}`}
          className="flex items-center gap-1.5 hover:opacity-80 transition-opacity shrink-0"
        >
          <Grid3x3 className="size-5 text-primary" />
          <span className="font-bold text-sm sm:text-base">DDashBoard</span>
        </Link>
        <div className="flex items-center gap-1 sm:gap-3">
          <nav className="flex gap-2 sm:gap-4 text-xs sm:text-sm text-muted-foreground">
            <Link href={`/${locale}/about`} className="hover:text-foreground transition-colors">
              About
            </Link>
            <Link href={`/${locale}/rules`} className="hover:text-foreground transition-colors">
              Rules
            </Link>
            <Link href={`/${locale}/terms`} className="hover:text-foreground transition-colors">
              Terms
            </Link>
            <Link href={`/${locale}/privacy`} className="hover:text-foreground transition-colors">
              Privacy
            </Link>
          </nav>
          <div className="flex items-center">
            <LocaleSwitcher currentLocale={locale} />
            <ThemeToggleButton start="top-right" variant="circle-blur" />
          </div>
        </div>
      </div>
    </header>
  )
}
