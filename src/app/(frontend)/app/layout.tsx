import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar'
import { AppSidebar } from '@/components/layout/AppSidebar'
import { NotificationBell } from '@/components/notifications/NotificationBell'
import { ThemeToggleButton } from '@/components/theme/theme-toggle'
import { LocaleSwitcher } from '@/components/locale-switcher'
import { AdminDebugMenu } from '@/components/admin/AdminDebugMenu'
import { auth } from '@/lib/auth'
import { getUserLocale } from '@/services/locale'
import { redirect } from 'next/navigation'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()

  if (!session.user) {
    redirect('/login')
  }

  const isAdmin = session.user.roles === 'admin'
  const locale = await getUserLocale()

  return (
    <SidebarProvider>
      <AppSidebar user={{
        ingameNick: session.user.ingameNick ?? undefined,
        roles: session.user.roles ?? undefined,
        skin: session.user.ingameStats?.skin as { name?: string; color_body?: number; color_feet?: number } | undefined,
      }} />
      <main className="flex-1 flex min-w-0 flex-col min-h-screen">
        <header className="flex items-center justify-between p-4 border-b sticky top-0  bg-background/95 backdrop-blur z-10">
          <SidebarTrigger />
          <div className="flex items-center gap-3">
            <LocaleSwitcher currentLocale={locale} />
            <NotificationBell />
            <ThemeToggleButton />
          </div>
        </header>
        <div className="flex-1 p-6  overflow-hidden">{children}</div>
      </main>
      {isAdmin && <AdminDebugMenu />}
    </SidebarProvider>
  )
}
