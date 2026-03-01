import { getTranslations } from 'next-intl/server'
import { getAlternates } from '@/lib/metadata'
import PrivacyContent from './content'

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'privacy' })
  return {
    title: t('title'),
    description: t('title'),
    alternates: getAlternates(locale, '/privacy'),
  }
}

export default function PrivacyPage() {
  return <PrivacyContent />
}
