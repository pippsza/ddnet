'use client'

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
  useSidebar,
} from '@/components/ui/sidebar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  LayoutDashboard,
  Users,
  UserPlus,
  Grid3X3,
  Trophy,
  Settings,
  Bot,
  LogOut,
  ChevronsUpDown,
  LifeBuoy,
  Ticket,
  Wrench,
  MessageSquare,
  FileText,
  MessageCircle,
  Bell,
  Medal,
  FolderOpen,
  Container,
  Gamepad2,
  Bug,
  Megaphone,
  BarChart3,
  Eye,
} from 'lucide-react'
import { TeeAvatarWithFallback, getDDNetSkinUrl } from '@/components/tee/TeeAvatar'
import { OnlineStatusIndicator } from '@/components/tee/OnlineStatusIndicator'
import { RoleBadge } from '@/components/ui/status-badge'
import { useNotifications } from '@/hooks/use-notifications'
import useSWR from 'swr'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import { APP_SHORT_NAME, APP_SECONDARY_NAME } from '@/lib/constants'
import type { ResolvedPermissions } from '@/lib/permissions'
import { Shield, Swords } from 'lucide-react'
import { useTranslations } from 'next-intl'

const mainItems = [{ titleKey: 'dashboard', url: '/app/dashboard', icon: LayoutDashboard }]

const gameItems = [
  { titleKey: 'bingo', url: '/app/bingo', icon: Grid3X3, requiredPage: 'bingo' },
  { titleKey: 'race', url: '/app/race', icon: Trophy, requiredPage: 'race' },
  { titleKey: 'leaderboard', url: '/app/leaderboard', icon: Medal, requiredPage: 'leaderboard' },
]

const socialItems = [
  { titleKey: 'players', url: '/app/players', icon: Users, requiredPage: 'players' },
  { titleKey: 'friends', url: '/app/friends', icon: UserPlus, requiredPage: 'friends' },
  {
    titleKey: 'onlinePlayers',
    url: '/app/online-players',
    icon: Eye,
    requiredPage: 'online_players',
  },
  { titleKey: 'chat', url: '/app/chat', icon: MessageCircle, requiredPage: 'chat' },
  { titleKey: 'forum', url: '/app/forum', icon: MessageSquare, requiredPage: 'forum' },
  { titleKey: 'articles', url: '/app/articles', icon: FileText, requiredPage: 'articles' },
]

const otherItems = [
  {
    titleKey: 'notifications',
    url: '/app/notifications',
    icon: Bell,
    requiredPage: 'notifications' as string | undefined,
  },
  {
    titleKey: 'support',
    url: '/support',
    icon: LifeBuoy,
    requiredPage: 'support' as string | undefined,
  },
  {
    titleKey: 'settings',
    url: '/app/settings',
    icon: Settings,
    requiredPage: undefined as string | undefined,
  },
]

const adminItems = [
  { titleKey: 'botManagement', url: '/app/admin/bots', icon: Bot, requiredPage: 'bots' },
  {
    titleKey: 'containerTest',
    url: '/app/admin/container-test',
    icon: Container,
    requiredPage: 'container_test',
  },
  {
    titleKey: 'adminNotifications',
    url: '/app/admin/notifications',
    icon: Megaphone,
    requiredPage: 'notifications',
  },
  { titleKey: 'debug', url: '/app/admin/debug', icon: Bug, requiredPage: 'debug' },
  {
    titleKey: 'categories',
    url: '/app/admin/categories',
    icon: FolderOpen,
    requiredPage: 'categories',
  },
  { titleKey: 'tickets', url: '/app/admin/tickets', icon: Ticket, requiredPage: 'tickets' },
  { titleKey: 'stats', url: '/app/admin/stats', icon: BarChart3, requiredPage: 'stats' },
  { titleKey: 'roles', url: '/app/admin/roles', icon: Shield, requiredPage: 'roles' },
]

const devItems = [{ titleKey: 'devTools', url: '/app/dev', icon: Wrench }]

const isDev = process.env.NODE_ENV === 'development'

interface AppSidebarProps {
  user: {
    ingameNick?: string
    permissions: ResolvedPermissions
    skin?: { name?: string; color_body?: number; color_feet?: number }
    activeGame?: { relationTo: 'bingo' | 'races'; value: string } | null
  }
}

const chatFetcher = (url: string) =>
  fetch(url, { credentials: 'include' }).then((r) => (r.ok ? r.json() : null))

const meFetcher = (url: string) =>
  fetch(url, { credentials: 'include' }).then((r) => (r.ok ? r.json() : null))

export function AppSidebar({ user }: AppSidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const { isMobile, setOpenMobile } = useSidebar()
  const { notifications, unreadCount } = useNotifications()
  const t = useTranslations('nav')

  const dmCount = notifications.filter((n) => !n.isRead && n.type === 'direct_message').length
  const forumCount = notifications.filter((n) => !n.isRead && n.type === 'forum_reply').length
  const supportCount = notifications.filter((n) => !n.isRead && n.type === 'support_reply').length
  const friendCount = notifications.filter((n) => !n.isRead && n.type === 'friend_request').length

  const sidebarBadge = (count: number) =>
    count > 0 ? (count > 9 ? '9+' : count) : null

  const badgeByUrl: Record<string, number> = {
    '/app/chat': dmCount,
    '/app/forum': forumCount,
    '/app/friends': friendCount,
  }
  const [mounted, setMounted] = useState(false)
  const [chatMentions, setChatMentions] = useState(0)

  // Poll for activeGame changes so the sidebar updates when a game ends
  const { data: meData } = useSWR(user.activeGame ? '/api/users/me' : null, meFetcher, {
    refreshInterval: 10000,
    revalidateOnFocus: true,
  })
  const activeGame = meData?.user?.activeGame
    ? {
        relationTo: meData.user.activeGame.relationTo as 'bingo' | 'races',
        value:
          typeof meData.user.activeGame.value === 'object'
            ? meData.user.activeGame.value.id
            : meData.user.activeGame.value,
      }
    : meData
      ? null
      : user.activeGame

  const isAdminUser = user.permissions.isAdmin
  const pages = user.permissions.pages
  const hasPage = (page?: string) => !page || isAdminUser || pages.includes(page)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Listen for ingame chat mention events
  useEffect(() => {
    const sync = () => {
      const val = localStorage.getItem('ingame-chat-mentions')
      setChatMentions(val ? parseInt(val, 10) || 0 : 0)
    }
    const onStorage = (e: StorageEvent) => {
      if (e.key === 'ingame-chat-mentions') sync()
    }
    sync()
    window.addEventListener('ingame-chat-mentions', sync)
    window.addEventListener('storage', onStorage)
    return () => {
      window.removeEventListener('ingame-chat-mentions', sync)
      window.removeEventListener('storage', onStorage)
    }
  }, [])

  // Poll for active ingame chat session
  const { data: activeChatData } = useSWR('/api/ingame-chat', chatFetcher, {
    refreshInterval: 10000,
    revalidateOnFocus: true,
  })
  const activeChat = mounted && activeChatData?.sessionId ? activeChatData : null

  const handleNavClick = () => {
    if (isMobile) setOpenMobile(false)
  }

  const handleLogout = async () => {
    await fetch('/api/users/logout', { method: 'POST', credentials: 'include' })
    router.push('/login')
    router.refresh()
  }

  return (
    <Sidebar>
      <SidebarHeader className="p-4">
        <Link href="/app" className="flex items-baseline">
          <span className="text-xl font-bold">{APP_SHORT_NAME}</span>
          <span className="text-md font-medium text-muted-foreground ml-0.5">
            {APP_SECONDARY_NAME}
          </span>
        </Link>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainItems.map((item) => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton asChild isActive={pathname.startsWith(item.url)}>
                    <Link href={item.url} onClick={handleNavClick}>
                      <item.icon className="h-4 w-4" />
                      <span>{t(item.titleKey)}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
              {activeGame && (
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    isActive={
                      pathname.startsWith(
                        activeGame.relationTo === 'bingo'
                          ? `/app/bingo/${activeGame.value}`
                          : `/app/race/${activeGame.value}`,
                      )
                    }
                  >
                    <Link
                      href={
                        activeGame.relationTo === 'bingo'
                          ? `/app/bingo/${activeGame.value}`
                          : `/app/race/${activeGame.value}`
                      }
                      onClick={handleNavClick}
                    >
                      <Swords className="h-4 w-4" />
                      <span>{t('currentGame')}</span>
                    </Link>
                  </SidebarMenuButton>
                  <SidebarMenuBadge>
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
                    </span>
                  </SidebarMenuBadge>
                </SidebarMenuItem>
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {gameItems.some((item) => hasPage(item.requiredPage)) && (
          <SidebarGroup>
            <SidebarGroupLabel>{t('games')}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {gameItems
                  .filter((item) => hasPage(item.requiredPage))
                  .map((item) => (
                    <SidebarMenuItem key={item.url}>
                      <SidebarMenuButton asChild isActive={pathname.startsWith(item.url)}>
                        <Link href={item.url} onClick={handleNavClick}>
                          <item.icon className="h-4 w-4" />
                          <span>{t(item.titleKey)}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {(socialItems.some((item) => hasPage(item.requiredPage)) ||
          (activeChat && hasPage('ingame_chat'))) && (
          <SidebarGroup>
            <SidebarGroupLabel>{t('community')}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {socialItems
                  .filter((item) => hasPage(item.requiredPage))
                  .map((item) => {
                    const badge = mounted ? sidebarBadge(badgeByUrl[item.url] ?? 0) : null
                    return (
                      <SidebarMenuItem key={item.url}>
                        <SidebarMenuButton asChild isActive={pathname.startsWith(item.url)}>
                          <Link href={item.url} onClick={handleNavClick}>
                            <item.icon className="h-4 w-4" />
                            <span>{t(item.titleKey)}</span>
                          </Link>
                        </SidebarMenuButton>
                        {badge !== null && (
                          <SidebarMenuBadge className="bg-destructive text-destructive-foreground text-[10px] font-bold rounded-full h-4 min-w-4 flex items-center justify-center px-1">
                            {badge}
                          </SidebarMenuBadge>
                        )}
                      </SidebarMenuItem>
                    )
                  })}
                {activeChat && hasPage('ingame_chat') && (
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild isActive={pathname.startsWith('/app/ingame-chat')}>
                      <Link
                        href={`/app/ingame-chat?sessionId=${activeChat.sessionId}`}
                        onClick={handleNavClick}
                      >
                        <Gamepad2 className="h-4 w-4" />
                        <span>{t('ingameChat')}</span>
                      </Link>
                    </SidebarMenuButton>
                    <SidebarMenuBadge>
                      {chatMentions > 0 ? (
                        <span className="bg-sky-500 text-white text-[10px] font-bold rounded-full h-4 min-w-4 flex items-center justify-center px-1">
                          {chatMentions > 9 ? '9+' : chatMentions}
                        </span>
                      ) : (
                        <span className="relative flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
                        </span>
                      )}
                    </SidebarMenuBadge>
                  </SidebarMenuItem>
                )}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {(user.permissions.isAdmin || user.permissions.adminPages.length > 0) && (
          <SidebarGroup>
            <SidebarGroupLabel>{t('admin')}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {adminItems
                  .filter(
                    (item) =>
                      user.permissions.isAdmin ||
                      user.permissions.adminPages.includes(item.requiredPage),
                  )
                  .map((item) => (
                    <SidebarMenuItem key={item.url}>
                      <SidebarMenuButton asChild isActive={pathname.startsWith(item.url)}>
                        <Link href={item.url} onClick={handleNavClick}>
                          <item.icon className="h-4 w-4" />
                          <span>{t(item.titleKey)}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {isDev && (
          <SidebarGroup>
            <SidebarGroupLabel>{t('development')}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {devItems.map((item) => (
                  <SidebarMenuItem key={item.url}>
                    <SidebarMenuButton asChild isActive={pathname.startsWith(item.url)}>
                      <Link href={item.url} onClick={handleNavClick}>
                        <item.icon className="h-4 w-4" />
                        <span>{t(item.titleKey)}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          {otherItems
            .filter((item) => hasPage(item.requiredPage))
            .map((item) => (
              <SidebarMenuItem key={item.url}>
                <SidebarMenuButton asChild isActive={pathname.startsWith(item.url)}>
                  <Link href={item.url} onClick={handleNavClick}>
                    <item.icon className="h-4 w-4" />
                    <span>{t(item.titleKey)}</span>
                  </Link>
                </SidebarMenuButton>
                {item.url === '/app/notifications' && mounted && unreadCount > 0 && (
                  <SidebarMenuBadge className="bg-destructive text-destructive-foreground">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </SidebarMenuBadge>
                )}
                {item.url === '/support' && mounted && supportCount > 0 && (
                  <SidebarMenuBadge className="bg-destructive text-destructive-foreground text-[10px] font-bold rounded-full h-4 min-w-4 flex items-center justify-center px-1">
                    {supportCount > 9 ? '9+' : supportCount}
                  </SidebarMenuBadge>
                )}
              </SidebarMenuItem>
            ))}
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton className="h-auto py-2">
                  <OnlineStatusIndicator
                    status={{ platformOnline: true, inGameOnline: false }}
                    size="xs"
                  >
                    <TeeAvatarWithFallback
                      skinUrl={user.skin?.name ? getDDNetSkinUrl(user.skin.name) : undefined}
                      bodyColor={user.skin?.color_body}
                      feetColor={user.skin?.color_feet}
                      useCustomColors={!!(user.skin?.color_body || user.skin?.color_feet)}
                      size="xs"
                    />
                  </OnlineStatusIndicator>
                  <div className="flex-1 min-w-0 text-left">
                    <p className="font-medium truncate my-0 text-sm">{user.ingameNick}</p>
                    <RoleBadge
                      role={user.permissions.primaryRole}
                      className="text-[10px] px-1 py-0"
                    />
                  </div>
                  <ChevronsUpDown className="ml-auto h-4 w-4 shrink-0 opacity-50" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent side="top" align="start" className="w-56">
                <DropdownMenuItem asChild>
                  <Link href="/app/settings" onClick={handleNavClick}>
                    <Settings className="mr-2 h-4 w-4" />
                    {t('userMenu.settings')}
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout}>
                  <LogOut className="mr-2 h-4 w-4" />
                  {t('userMenu.logout')}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}
