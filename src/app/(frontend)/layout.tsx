import type { Metadata, Viewport } from 'next'
import './globals.css'
import { Toaster } from '@/components/ui/sonner'

import { NextIntlClientProvider } from 'next-intl'

import Script from 'next/script'
import { ThemeProvider } from '@/components/theme/theme-provider'
import { themeIds, themeClassMap } from '@/lib/themes'
import { AuthProvider } from '@/components/auth/AuthProvider'
import { FloatingBackground } from '@/components/ui/floating-background'
import { ServiceWorkerRegister } from '@/components/ServiceWorkerRegister'
import { APP_NAME, APP_DESCRIPTION } from '@/lib/constants'

export const metadata: Metadata = {
  title: APP_NAME,
  description: APP_DESCRIPTION,
  manifest: '/manifest.json',
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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
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
          <NextIntlClientProvider>
            <AuthProvider>
              <Toaster />
              <div className="relative z-10">{children}</div>
              <div className=" fixed bottom-0 right-0 text-primary bg-secondary p-2 rounded-tl-2xl">
                v1.0.0
              </div>
            </AuthProvider>
          </NextIntlClientProvider>
        </ThemeProvider>
        <ServiceWorkerRegister />
      </body>
    </html>
  )
}
