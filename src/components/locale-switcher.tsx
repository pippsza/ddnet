'use client'

import { usePathname, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Globe } from 'lucide-react'
import { setUserLocale } from '@/services/locale'
import { locales as allLocales, type Locale } from '@/i18n/config'

const locales = [
  { code: 'en', name: 'English' },
  { code: 'ru', name: 'Русский' },
  { code: 'uk', name: 'Українська' },
  { code: 'de', name: 'Deutsch' },
  { code: 'tr', name: 'Türkçe' },
  { code: 'zh', name: '中文' },
] as const

export function LocaleSwitcher({ currentLocale }: { currentLocale: string }) {
  const router = useRouter()
  const pathname = usePathname()

  const handleLocaleChange = async (newLocale: string) => {
    // Always set cookie so app pages use the same locale
    await setUserLocale(newLocale as Locale)

    // Check if we're on a locale-prefixed public page
    const localePrefix = allLocales.find(
      (l) => pathname === `/${l}` || pathname.startsWith(`/${l}/`),
    )

    if (localePrefix) {
      // Public page: change URL to new locale
      const pathWithoutLocale = pathname.replace(`/${localePrefix}`, '') || ''
      router.push(`/${newLocale}${pathWithoutLocale}`)
    } else {
      // App/auth page: cookie-based, just refresh
      router.refresh()
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon">
          <Globe className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {locales.map((locale) => (
          <DropdownMenuItem
            key={locale.code}
            onClick={() => handleLocaleChange(locale.code)}
          >
            {locale.name}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
