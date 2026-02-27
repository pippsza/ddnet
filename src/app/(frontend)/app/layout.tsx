import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar'
import { AppSidebar } from '@/components/layout/AppSidebar'
import { NotificationBell } from '@/components/notifications/NotificationBell'
import { AnnouncementBanner } from '@/components/notifications/AnnouncementBanner'
import { ThemeToggleButton } from '@/components/theme/theme-toggle'
import { LocaleSwitcher } from '@/components/locale-switcher'
import { AdminDebugMenu } from '@/components/admin/AdminDebugMenu'
import { MaintenancePage } from '@/components/maintenance/MaintenancePage'
import { auth } from '@/lib/auth'
import { getUserLocale } from '@/services/locale'
import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { getPayload } from 'payload'
import payloadConfig from '@payload-config'
import { resolvePermissions } from '@/lib/permissions'
import type { PayloadRequest } from 'payload'

/** Map of path prefixes to required page permission keys */
const PAGE_ACCESS_MAP: Record<string, string> = {
  '/app/bingo': 'bingo',
  '/app/race': 'race',
  '/app/leaderboard': 'leaderboard',
  '/app/players': 'players',
  '/app/friends': 'friends',
  '/app/online-players': 'online_players',
  '/app/chat': 'chat',
  '/app/forum': 'forum',
  '/app/articles': 'articles',
  '/app/notifications': 'notifications',
  '/app/ingame-chat': 'ingame_chat',
}

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()

  if (!session.user) {
    redirect('/login')
  }

  const payload = await getPayload({ config: payloadConfig })
  const payloadReq = { user: session.user, payload } as unknown as PayloadRequest
  const permissions = await resolvePermissions(session.user as any, payloadReq)
  const locale = await getUserLocale()

  // Check app access — admin always has access, dashboard always accessible
  const hasAppAccess = permissions.isAdmin || permissions.pages.includes('app_access')

  // Determine current path for page-level gating
  const headersList = await headers()
  const pathname = headersList.get('x-forwarded-path') || headersList.get('x-invoke-path') || ''

  // Check if current page requires specific page permission
  let showMaintenance = false
  if (!permissions.isAdmin) {
    if (!hasAppAccess && !pathname.startsWith('/app/dashboard')) {
      showMaintenance = true
    } else if (hasAppAccess) {
      // Check page-specific permission
      for (const [prefix, pageKey] of Object.entries(PAGE_ACCESS_MAP)) {
        if (pathname.startsWith(prefix) && !permissions.pages.includes(pageKey)) {
          showMaintenance = true
          break
        }
      }
    }
  }

  return (
    <SidebarProvider>
      <AppSidebar
        user={{
          ingameNick: session.user.ingameNick ?? undefined,
          permissions,
          skin: session.user.ingameStats?.skin as
            | { name?: string; color_body?: number; color_feet?: number }
            | undefined,
          activeGame: session.user.activeGame
            ? {
                relationTo: (session.user.activeGame as any).relationTo,
                value:
                  typeof (session.user.activeGame as any).value === 'object'
                    ? (session.user.activeGame as any).value.id
                    : (session.user.activeGame as any).value,
              }
            : null,
        }}
      />
      <main className="flex-1 flex min-w-0 flex-col min-h-screen">
        <header className="flex items-center justify-between  p-4 border-b sticky top-0 bg-background/95 backdrop-blur z-999909999999">
          <SidebarTrigger />
          <div className="flex items-center gap-3">
            <LocaleSwitcher currentLocale={locale} />
            <NotificationBell />
            <ThemeToggleButton start="top-right" variant="circle-blur" />
          </div>
        </header>
        <div className="flex-1 p-6 pt-2 overflow-hidden justify-center">
          {showMaintenance ? <MaintenancePage /> : children}
        </div>
      </main>
      {permissions.isAdmin && <AdminDebugMenu />}
      <AnnouncementBanner />
    </SidebarProvider>
  )
}
