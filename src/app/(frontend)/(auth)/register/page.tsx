import { AuthCard } from '@/components/auth/AuthCard'
import { RegisterForm } from '@/components/auth/RegisterForm'
import { getTranslations } from 'next-intl/server'
import Link from 'next/link'

export default async function RegisterPage() {
  const t = await getTranslations('auth')

  return (
    <AuthCard
      title={t('register')}
      description={t('registerDescription')}
      footer={
        <p className="text-center text-sm text-muted-foreground">
          {t('haveAccount')}{' '}
          <Link href="/login" className="text-primary hover:underline">
            {t('signIn')}
          </Link>
        </p>
      }
    >
      <RegisterForm />
    </AuthCard>
  )
}
