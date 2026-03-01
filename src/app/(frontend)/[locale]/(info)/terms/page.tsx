import { getTranslations } from 'next-intl/server'
import { getAlternates } from '@/lib/metadata'
import TermsContent from './content'

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'terms' })
  return {
    title: t('title'),
    description: t('title'),
    alternates: getAlternates(locale, '/terms'),
  }
}

export default function TermsPage() {
  return <TermsContent />
}
