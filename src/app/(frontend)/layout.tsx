import type { Metadata } from 'next'
import './globals.css'
import { Toaster } from '@/components/ui/sonner'

import { NextIntlClientProvider } from 'next-intl'

import Script from 'next/script'
import { ThemeProvider } from '@/components/theme/theme-provider'
import { AuthProvider } from '@/components/auth/AuthProvider'

export const metadata: Metadata = {
  title: 'Testing platform',
  description: 'Testing platform description',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#3b82f6" />
      </head>
      <body>
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem disableTransitionOnChange>
          {process.env.NODE_ENV === 'development' && (
            <Script
              src="https://unpkg.com/react-scan/dist/auto.global.js"
              strategy="afterInteractive"
              crossOrigin="anonymous"
            />
          )}

          <NextIntlClientProvider>
            <AuthProvider>
              <Toaster />
              {children}
            </AuthProvider>
          </NextIntlClientProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
