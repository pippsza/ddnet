import type { Metadata } from 'next'
import './globals.css'
import { Toaster } from '@/components/ui/sonner'

import { NextIntlClientProvider } from 'next-intl'

import { PayloadSessionProvider } from 'payload-authjs/client'
import Script from 'next/script'
import { ThemeProvider } from '@/components/theme/theme-provider'
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
            <PayloadSessionProvider userCollectionSlug="users">
              <Toaster />
              {children}
            </PayloadSessionProvider>
          </NextIntlClientProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
