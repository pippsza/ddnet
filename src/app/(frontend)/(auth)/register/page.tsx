'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { AuthPageLayout } from '@/components/auth/AuthPageLayout'
import { RegisterForm } from '@/components/auth/RegisterForm'
import { InlineClaimFlow } from '@/components/auth/InlineClaimFlow'
import { ClaimRegisterForm } from '@/components/auth/ClaimRegisterForm'
import { useBotSettings } from '@/hooks/use-bot-settings'
import { AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'

type RegisterView = 'form' | 'claim' | 'claim-register'

export default function RegisterPage() {
  const t = useTranslations('auth')
  const { botSettings } = useBotSettings()
  const [passwordVisible, setPasswordVisible] = useState(false)
  const [view, setView] = useState<RegisterView>('form')
  const [claimNick, setClaimNick] = useState('')
  const [claimId, setClaimId] = useState('')

  const handleNickTakenError = (ingameNick: string) => {
    setClaimNick(ingameNick)
    setView('claim')
  }

  const handleClaimBack = () => {
    setView('form')
  }

  const handleClaimSuccess = (id: string) => {
    setClaimId(id)
    setView('claim-register')
  }

  const getTitle = () => {
    switch (view) {
      case 'form': return t('register')
      case 'claim': return t('claimTitle')
      case 'claim-register': return t('claimRegisterTitle')
    }
  }

  const getDescription = () => {
    switch (view) {
      case 'form': return t('registerDescription')
      case 'claim': return t('claimDescription')
      case 'claim-register': return t('claimRegisterDescription')
    }
  }

  return (
    <AuthPageLayout
      title={getTitle()}
      description={getDescription()}
      leftTitle={t('joinUs')}
      leftDescription={t('registerInfo')}
      passwordVisible={passwordVisible}
      footer={
        view === 'form' ? (
          <p className="text-center text-sm text-muted-foreground">
            {t('haveAccount')}{' '}
            <Link href="/login" className="text-primary hover:underline">
              {t('signIn')}
            </Link>
          </p>
        ) : undefined
      }
    >
      <AnimatePresence mode="wait">
        {view === 'form' && (
          <motion.div
            key="register-form"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
          >
            <RegisterForm
              onPasswordVisibilityChange={setPasswordVisible}
              onNickTakenError={handleNickTakenError}
            />
          </motion.div>
        )}
        {view === 'claim' && (
          <motion.div
            key="claim-flow"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
          >
            {!botSettings.verificationBotEnabled ? (
              <div className="space-y-4">
                <div className="flex items-start gap-3 p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
                  <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5 text-yellow-500" />
                  <div>
                    <p className="text-sm font-medium text-yellow-700 dark:text-yellow-400">
                      Claim Temporarily Unavailable
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      The verification bot is currently under maintenance. To claim this nickname,
                      please contact an admin via a{' '}
                      <Link href="/support" className="text-primary hover:underline">support ticket</Link>.
                    </p>
                  </div>
                </div>
                <Button variant="outline" onClick={handleClaimBack} className="w-full">
                  Back to Registration
                </Button>
              </div>
            ) : (
              <InlineClaimFlow
                ingameNick={claimNick}
                onBack={handleClaimBack}
                onClaimSuccess={handleClaimSuccess}
              />
            )}
          </motion.div>
        )}
        {view === 'claim-register' && (
          <motion.div
            key="claim-register-form"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
          >
            <ClaimRegisterForm
              ingameNick={claimNick}
              claimId={claimId}
              onPasswordVisibilityChange={setPasswordVisible}
            />
          </motion.div>
        )}
      </AnimatePresence>
      <p className="text-center text-xs text-muted-foreground mt-4">
        Having trouble with your nickname?{' '}
        <Link href="/support" className="text-primary hover:underline">
          Contact an admin
        </Link>
      </p>
    </AuthPageLayout>
  )
}
