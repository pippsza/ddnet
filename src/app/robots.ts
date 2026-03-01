import type { MetadataRoute } from 'next'

const BASE_URL = process.env.NEXT_PUBLIC_SERVER_URL || 'https://ddashboard.gg'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/app/', '/api/', '/admin/'],
    },
    sitemap: `${BASE_URL}/sitemap.xml`,
  }
}
