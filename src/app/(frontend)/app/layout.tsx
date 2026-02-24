import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar'
import { AppSidebar } from '@/components/layout/AppSidebar'
import { NotificationBell } from '@/components/notifications/NotificationBell'
import { ThemeToggleButton } from '@/components/theme/theme-toggle'
import { LocaleSwitcher } from '@/components/locale-switcher'
import { AdminDebugMenu } from '@/components/admin/AdminDebugMenu'
import { auth } from '@/lib/auth'
import { getUserLocale } from '@/services/locale'
import { redirect } from 'next/navigation'
import { getPayload } from 'payload'
import payloadConfig from '@payload-config'
import { resolvePermissions } from '@/lib/permissions'
import type { PayloadRequest } from 'payload'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()

  if (!session.user) {
    redirect('/login')
  }

  const payload = await getPayload({ config: payloadConfig })
  const payloadReq = { user: session.user, payload } as unknown as PayloadRequest
  const permissions = await resolvePermissions(session.user as any, payloadReq)
  const locale = await getUserLocale()

  return (
    <SidebarProvider>
      <AppSidebar
        user={{
          ingameNick: session.user.ingameNick ?? undefined,
          permissions,
          skin: session.user.ingameStats?.skin as
            | { name?: string; color_body?: number; color_feet?: number }
            | undefined,
        }}
      />
      <main className="flex-1 flex min-w-0 flex-col min-h-screen">
        <header className="flex items-center justify-between p-4 border-b sticky top-0  bg-background/95 backdrop-blur z-10">
          <SidebarTrigger />
          <div className="flex items-center gap-3">
            <LocaleSwitcher currentLocale={locale} />
            <NotificationBell />
            <ThemeToggleButton />
          </div>
        </header>
        <div className="flex-1 p-6  overflow-hidden justify-center">{children}</div>
      </main>
      {permissions.isAdmin && <AdminDebugMenu />}
    </SidebarProvider>
  )
}
