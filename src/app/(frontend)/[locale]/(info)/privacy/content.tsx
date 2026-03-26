'use client'

import Link from 'next/link'
import useSWR from 'swr'
import { useTranslations, useLocale } from 'next-intl'
import { PageTransition, FadeIn, StaggerContainer, StaggerItem } from '@/components/ui/animations'
import { ArrowLeft, Shield } from 'lucide-react'

const fetcher = (url: string) => fetch(url).then((r) => r.json())

const FALLBACK_KEYS = [
  'dataCollected',
  'usage',
  'cookies',
  'thirdParty',
  'retention',
  'rights',
  'children',
  'changes',
] as const

export default function PrivacyContent() {
  const t = useTranslations('privacy')
  const locale = useLocale()
  const { data } = useSWR(`/api/globals/privacy-page?depth=0&locale=${locale}`, fetcher)

  const sections = data?.sections?.length > 0
    ? data.sections
    : FALLBACK_KEYS.map((key) => ({
        title: t(`sections.${key}.title`),
        content: t(`sections.${key}.content`),
      }))

  const lastUpdated = data?.lastUpdated || t('lastUpdated')

  return (
    <PageTransition className="max-w-3xl mx-auto px-4 py-6 sm:py-12 space-y-6 sm:space-y-8 backdrop-blur-xs bg-black/15 rounded-2xl my-4">
      <Link
        href={`/${locale}`}
        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" /> {t('backToHome')}
      </Link>

      <FadeIn className="space-y-2">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-green-500/10 text-green-500">
            <Shield className="h-5 w-5" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold">{t('title')}</h1>
        </div>
        <p className="text-sm text-muted-foreground">{lastUpdated}</p>
      </FadeIn>

      <StaggerContainer className="space-y-8">
        {sections.map((section: any, i: number) => (
          <StaggerItem key={i} className="space-y-2">
            <h2 className="text-lg font-semibold">{section.title}</h2>
            <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
              {section.content}
            </p>
            {i < sections.length - 1 && <div className="border-b pt-4" />}
          </StaggerItem>
        ))}
      </StaggerContainer>

      <FadeIn className="text-center text-sm text-muted-foreground">
        <p>
          {t('contact')}{' '}
          <Link href={`/${locale}/about`} className="text-primary hover:underline">
            {t('contactLink')}
          </Link>
        </p>
      </FadeIn>
    </PageTransition>
  )
}
