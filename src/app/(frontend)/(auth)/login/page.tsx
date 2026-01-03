import { AuthCard } from '@/components/auth/AuthCard'
import { LoginForm } from '@/components/auth/LoginForm'
import { getTranslations } from 'next-intl/server'
import Link from 'next/link'

export default async function LoginPage() {
  const t = await getTranslations('auth')

  return (
    <AuthCard
      title={t('login')}
      description={t('loginDescription')}
      footer={
        <p className="text-center text-sm text-muted-foreground">
          {t('noAccount')}{' '}
          <Link href="/register" className="text-primary hover:underline">
            {t('createAccount')}
          </Link>
        </p>
      }
    >
      <LoginForm />
    </AuthCard>
  )
}
