import type { MetadataRoute } from 'next'
import { locales } from '@/i18n/config'

const BASE_URL = process.env.NEXT_PUBLIC_SERVER_URL || 'https://ddashboard.gg'

const publicPages = ['', '/about', '/privacy', '/rules', '/terms']

export default function sitemap(): MetadataRoute.Sitemap {
  const entries: MetadataRoute.Sitemap = []

  for (const page of publicPages) {
    for (const locale of locales) {
      entries.push({
        url: `${BASE_URL}/${locale}${page}`,
        lastModified: new Date(),
        alternates: {
          languages: Object.fromEntries(
            locales.map((l) => [l, `${BASE_URL}/${l}${page}`]),
          ),
        },
      })
    }
  }

  return entries
}
