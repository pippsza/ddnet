'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { AuthPageLayout } from '@/components/auth/AuthPageLayout'
import { RegisterForm } from '@/components/auth/RegisterForm'
import { InlineClaimFlow } from '@/components/auth/InlineClaimFlow'
import { ClaimRegisterForm } from '@/components/auth/ClaimRegisterForm'

type RegisterView = 'form' | 'claim' | 'claim-register'

export default function RegisterPage() {
  const t = useTranslations('auth')
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
            <InlineClaimFlow
              ingameNick={claimNick}
              onBack={handleClaimBack}
              onClaimSuccess={handleClaimSuccess}
            />
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
    </AuthPageLayout>
  )
}
