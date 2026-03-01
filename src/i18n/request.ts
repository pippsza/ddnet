import { getRequestConfig } from 'next-intl/server'
import { headers } from 'next/headers'
import { getUserLocale } from '../services/locale'
import { locales, type Locale } from './config'

export default getRequestConfig(async () => {
  // Prefer URL-based locale (set by middleware for public pages)
  const headersList = await headers()
  const urlLocale = headersList.get('x-locale')

  let locale: string
  if (urlLocale && locales.includes(urlLocale as Locale)) {
    locale = urlLocale
  } else {
    locale = await getUserLocale()
  }

  return {
    locale,
    messages: (await import(`../../messages/${locale}/index`)).default,
  }
})
