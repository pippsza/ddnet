'use client'

import { useTransition } from 'react'
import { Globe } from 'lucide-react'
import { Locale, locales } from '@/i18n/config'
import { setUserLocale } from '@/services/locale'
import { Button } from '../ui/button'

type Props = {
  defaultValue: string
  items?: Array<{ value: string; label: string }>
  className?: string
}

export default function LocaleSwitcherSelect({ defaultValue, className }: Props) {
  const [isPending, startTransition] = useTransition()

  function onClick() {
    const current = (defaultValue || locales[0]) as Locale
    const idx = locales.indexOf(current)
    const next = locales[(idx + 1) % locales.length]

    startTransition(() => {
      setUserLocale(next)
    })
  }

  return (
    <Button
      variant={'secondary'}
      aria-label="Switch language"
      title="Switch language"
      onClick={onClick}
      className={`p-2 flex gap-1 rounded-sm hover:text-slate-950 transition-all hover:bg-slate-200  ${isPending ? 'opacity-60 pointer-events-none' : ''} ${className}`}
    >
      <Globe className="h-5 w-5" />
    </Button>
  )
}
