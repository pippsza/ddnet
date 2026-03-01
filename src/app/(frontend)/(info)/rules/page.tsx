'use client'

import Link from 'next/link'
import useSWR from 'swr'
import { useTranslations, useLocale } from 'next-intl'
import { Badge } from '@/components/ui/badge'
import { PageTransition, FadeIn, StaggerContainer, StaggerItem } from '@/components/ui/animations'
import {
  ArrowLeft,
  Scale,
  UserCheck,
  Swords,
  MessageSquare,
  ShieldAlert,
  Ban,
  Handshake,
  Grid3X3,
  Route,
} from 'lucide-react'

const fetcher = (url: string) => fetch(url).then((r) => r.json())

const RULE_ICONS = [UserCheck, Swords, MessageSquare, ShieldAlert, Ban, Handshake, Grid3X3, Route] as const

const FALLBACK_KEYS = [
  'accounts',
  'fairPlay',
  'communication',
  'content',
  'enforcement',
  'community',
  'bingo',
  'race',
] as const

export default function RulesPage() {
  const t = useTranslations('rules')
  const locale = useLocale()
  const { data } = useSWR(`/api/globals/rules-page?depth=0&locale=${locale}`, fetcher)

  const sections = data?.sections?.length > 0
    ? data.sections
    : FALLBACK_KEYS.map((key) => ({
        title: t(`sections.${key}.title`),
        content: t(`sections.${key}.content`),
      }))

  return (
    <PageTransition className="max-w-3xl mx-auto px-4 py-6 sm:py-12 space-y-6 sm:space-y-8">
      <Link
        href="/"
        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" /> {t('backToHome')}
      </Link>

      <FadeIn className="space-y-2">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-amber-500/10 text-amber-500">
            <Scale className="h-5 w-5" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold">{t('title')}</h1>
        </div>
        <p className="text-muted-foreground">{t('subtitle')}</p>
      </FadeIn>

      <StaggerContainer className="space-y-6">
        {sections.map((section: any, i: number) => {
          const Icon = RULE_ICONS[i] || Scale
          return (
            <StaggerItem key={i}>
              <div className="flex items-start gap-3 sm:gap-4">
                <div className="shrink-0 flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-muted mt-0.5">
                  <Icon className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground" />
                </div>
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-[10px] font-mono">
                      {String(i + 1).padStart(2, '0')}
                    </Badge>
                    <h2 className="font-semibold">{section.title}</h2>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
                    {section.content}
                  </p>
                </div>
              </div>
              {i < sections.length - 1 && <div className="border-b mt-6" />}
            </StaggerItem>
          )
        })}
      </StaggerContainer>

      <FadeIn className="text-center space-y-2">
        <p className="text-sm text-muted-foreground">{t('footer')}</p>
        <Link href="/support" className="text-sm text-primary hover:underline">
          {t('reportViolation')}
        </Link>
      </FadeIn>
    </PageTransition>
  )
}
