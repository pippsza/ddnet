import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { MapBackground } from '@/components/landing/MapBackground'

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  const { user } = await auth()

  if (user && user !== null) {
    redirect('/app')
  }

  return (
    <>
      <MapBackground />
      {children}
    </>
  )
}
