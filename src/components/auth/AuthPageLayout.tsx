'use client'

import { motion } from 'framer-motion'
import { AuthMascot } from '@/components/auth/AuthMascot'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { ConditionalThemeToggle } from '@/components/theme/ConditionalThemeToggle'
import { RenderModeToggle } from '@/components/landing/RenderModeToggle'

interface AuthPageLayoutProps {
  title: string
  description?: string
  leftTitle: string
  leftDescription: string
  passwordVisible: boolean
  children: React.ReactNode
  footer?: React.ReactNode
}

export function AuthPageLayout({
  title,
  description,
  leftTitle,
  leftDescription,
  passwordVisible,
  children,
  footer,
}: AuthPageLayoutProps) {
  return (
    <div className="min-h-screen flex relative overflow-x-hidden">
      {/* Top-right controls */}
      <div className="fixed top-4 right-4 z-50 flex items-center gap-2">
        <ConditionalThemeToggle start="top-right" variant="circle-blur" />
        <RenderModeToggle />
      </div>

      {/* Left panel — desktop only */}
      <motion.div
        className="hidden lg:flex lg:w-1/2 flex-col items-center justify-center border-r border-border/40 bg-muted/5 p-8 gap-6"
        initial={{ opacity: 0, x: -30 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
      >
        <AuthMascot passwordVisible={passwordVisible} />
        <div className="text-center max-w-sm space-y-2">
          <h1 className="text-3xl font-bold">{leftTitle}</h1>
          <p className="text-muted-foreground">{leftDescription}</p>
        </div>
      </motion.div>

      {/* Right panel — desktop: card centered, mobile: no card */}
      <div className="flex-1 flex items-center justify-center p-4">
        {/* Desktop: card wrapper */}
        <motion.div
          className="hidden lg:block w-full max-w-md"
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, ease: 'easeOut', delay: 0.1 }}
        >
          <Card>
            <CardHeader className="text-center">
              <CardTitle className="text-2xl">{title}</CardTitle>
              {description && <CardDescription>{description}</CardDescription>}
            </CardHeader>
            <CardContent>{children}</CardContent>
            {footer && <div className="px-6 pb-6">{footer}</div>}
          </Card>
        </motion.div>

        {/* Mobile: no card, direct content */}
        <motion.div
          className="lg:hidden w-full max-w-md space-y-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
        >
          <AuthMascot passwordVisible={passwordVisible} />
          <div className="text-center space-y-1">
            <h1 className="text-2xl font-bold">{title}</h1>
            {description && <p className="text-sm text-muted-foreground">{description}</p>}
          </div>
          {children}
          {footer && <div>{footer}</div>}
        </motion.div>
      </div>
    </div>
  )
}
