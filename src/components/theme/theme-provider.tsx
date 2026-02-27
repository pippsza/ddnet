'use client'

import * as React from 'react'
import { ThemeProvider as NextThemesProvider, useTheme } from 'next-themes'

function ThemeDebugLogger() {
  const { theme, resolvedTheme, themes } = useTheme()

  React.useEffect(() => {
    console.log('[Theme Debug]', {
      theme,
      resolvedTheme,
      availableThemes: themes,
      htmlClasses: document.documentElement.className,
    })
  }, [theme, resolvedTheme, themes])

  return null
}

export function ThemeProvider({
  children,
  ...props
}: React.ComponentProps<typeof NextThemesProvider>) {
  return (
    <NextThemesProvider {...props}>
      {process.env.NODE_ENV === 'development' && <ThemeDebugLogger />}
      {children}
    </NextThemesProvider>
  )
}
