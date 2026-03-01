import { getTranslations } from 'next-intl/server'
import { getAlternates } from '@/lib/metadata'
import RulesContent from './content'

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'rules' })
  return {
    title: t('title'),
    description: t('subtitle'),
    alternates: getAlternates(locale, '/rules'),
  }
}

export default function RulesPage() {
  return <RulesContent />
}
