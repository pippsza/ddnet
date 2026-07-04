import { getRequestConfig } from 'next-intl/server'
import { headers } from 'next/headers'
import { APP_NAME } from '../lib/constants'
import { getUserLocale } from '../services/locale'
import { locales, type Locale } from './config'

/** Replace {appName} in all message strings at load time */
function injectConstants(messages: Record<string, unknown>): Record<string, unknown> {
  const json = JSON.stringify(messages)
  return JSON.parse(json.replace(/\{appName\}/g, APP_NAME))
}

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

  const raw = (await import(`../../messages/${locale}/index`)).default

  return {
    locale,
    messages: injectConstants(raw),
  }
})
