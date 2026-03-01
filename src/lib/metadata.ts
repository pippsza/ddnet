import { locales } from '@/i18n/config'

const BASE_URL = process.env.NEXT_PUBLIC_SERVER_URL || 'https://ddashboard.gg'

export function getAlternates(locale: string, path: string = '') {
  return {
    canonical: `${BASE_URL}/${locale}${path}`,
    languages: {
      ...Object.fromEntries(locales.map((l) => [l, `${BASE_URL}/${l}${path}`])),
      'x-default': `${BASE_URL}/en${path}`,
    },
  }
}
