import type { Metadata, Viewport } from 'next'
import './globals.css'
import { Toaster } from '@/components/ui/sonner'

import { NextIntlClientProvider } from 'next-intl'
import { headers } from 'next/headers'

import Script from 'next/script'
import { ThemeProvider } from '@/components/theme/theme-provider'
import { themeIds, themeClassMap } from '@/lib/themes'
import { AuthProvider } from '@/components/auth/AuthProvider'
import { FloatingBackground } from '@/components/ui/floating-background'
import { RenderModeProvider } from '@/context/RenderModeContext'
import { ThemeDebugPanel } from '@/components/theme/ThemeDebugPanel'
import { ServiceWorkerRegister } from '@/components/ServiceWorkerRegister'
import { APP_NAME, APP_DESCRIPTION } from '@/lib/constants'
import { getUserLocale } from '@/services/locale'

export const metadata: Metadata = {
  title: APP_NAME,
  description: APP_DESCRIPTION,
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: APP_NAME,
  },
  icons: {
    icon: '/favicon.ico',
    apple: '/icons/icon-192.png',
  },
}

export const viewport: Viewport = {
  themeColor: '#3b82f6',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const headersList = await headers()
  const locale = headersList.get('x-locale') || await getUserLocale()

  return (
    <html lang={locale} suppressHydrationWarning>
      <body suppressHydrationWarning>
        {/* Prevent crashes when browser translation tools modify the DOM */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if(typeof Node!=='undefined'){
                var rc=Node.prototype.removeChild;
                Node.prototype.removeChild=function(c){
                  return c.parentNode!==this?c:rc.apply(this,arguments)
                };
                var ib=Node.prototype.insertBefore;
                Node.prototype.insertBefore=function(n,r){
                  return r&&r.parentNode!==this?n:ib.apply(this,arguments)
                }
              }
            `,
          }}
        />
        <ThemeProvider
          attribute="class"
          defaultTheme="default-dark"
          themes={themeIds}
          value={themeClassMap}
        >
          {process.env.NODE_ENV === 'development' && (
            <Script
              src="https://unpkg.com/react-scan/dist/auto.global.js"
              strategy="afterInteractive"
              crossOrigin="anonymous"
            />
          )}

          <FloatingBackground />
          <RenderModeProvider>
          <NextIntlClientProvider>
            <AuthProvider>
              <Toaster />
              <div className="relative z-10">{children}</div>
              <div className="fixed bottom-0 right-0 text-primary bg-secondary p-2 rounded-tl-2xl text-xs">
                v{process.env.APP_VERSION}
              </div>
              {process.env.NODE_ENV === 'development' && <ThemeDebugPanel />}
            </AuthProvider>
          </NextIntlClientProvider>
          </RenderModeProvider>
        </ThemeProvider>
        <ServiceWorkerRegister />
      </body>
    </html>
  )
}
