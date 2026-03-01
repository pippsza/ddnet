import { getTranslations } from 'next-intl/server'
import { getAlternates } from '@/lib/metadata'
import AboutContent from './content'

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'about' })
  return {
    title: t('title'),
    description: t('defaultDescription'),
    alternates: getAlternates(locale, '/about'),
  }
}

export default function AboutPage() {
  return <AboutContent />
}
