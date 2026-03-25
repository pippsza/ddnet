import { headers as getHeaders } from 'next/headers.js'
import { getPayload } from 'payload'
import { getTranslations } from 'next-intl/server'
import config from '@/payload.config'
import { getAlternates } from '@/lib/metadata'
import { LandingPage } from '@/components/landing/LandingPage'
import { DevQuickLogin } from '@/components/auth/DevQuickLogin'

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'home' })
  return {
    title: t('hero.title'),
    description: t('hero.description'),
    alternates: getAlternates(locale),
  }
}

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  const headers = await getHeaders()
  const payloadConfig = await config
  const payload = await getPayload({ config: payloadConfig })
  const { user } = await payload.auth({ headers })

  return (
    <>
      <LandingPage isLoggedIn={!!user} locale={locale} />
      {/* <DevQuickLogin /> */}
    </>
  )
}
