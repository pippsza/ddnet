import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar'
import { AppSidebar } from '@/components/layout/AppSidebar'
import { NotificationBell } from '@/components/notifications/NotificationBell'
import { ThemeToggleButton } from '@/components/theme/theme-toggle'
import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()

  if (!session.user) {
    redirect('/login')
  }

  return (
    <SidebarProvider>
      <AppSidebar user={session.user} />
      <main className="flex-1 flex flex-col min-h-screen">
        <header className="flex items-center justify-between p-4 border-b sticky top-0 bg-background/95 backdrop-blur z-10">
          <SidebarTrigger />
          <div className="flex items-center gap-3">
            <NotificationBell />
            <ThemeToggleButton />
          </div>
        </header>
        <div className="flex-1 p-6">{children}</div>
      </main>
    </SidebarProvider>
  )
}
