'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { AuthPageLayout } from '@/components/auth/AuthPageLayout'
import { LoginForm } from '@/components/auth/LoginForm'

export default function LoginPage() {
  const t = useTranslations('auth')
  const [passwordVisible, setPasswordVisible] = useState(false)

  return (
    <AuthPageLayout
      title={t('login')}
      description={t('loginDescription')}
      leftTitle={t('welcomeBack')}
      leftDescription={t('loginInfo')}
      passwordVisible={passwordVisible}
      footer={
        <p className="text-center text-sm text-muted-foreground">
          {t('noAccount')}{' '}
          <Link href="/register" className="text-primary hover:underline">
            {t('createAccount')}
          </Link>
        </p>
      }
    >
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: 'easeOut', delay: 0.2 }}
      >
        <LoginForm onPasswordVisibilityChange={setPasswordVisible} />
      </motion.div>
    </AuthPageLayout>
  )
}
