import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  const { user } = await auth()

  if (user && user !== null) {
    redirect('/app')
  }

  return <>{children}</>
}
