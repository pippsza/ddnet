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
import { APP_NAME } from '@/lib/constants'
import type { ResolvedPermissions } from '@/lib/permissions'
import { Shield } from 'lucide-react'

const mainItems = [{ title: 'Dashboard', url: '/app/dashboard', icon: LayoutDashboard }]

const gameItems = [
  { title: 'Bingo', url: '/app/bingo', icon: Grid3X3 },
  { title: 'Race', url: '/app/race', icon: Trophy },
  { title: 'Leaderboard', url: '/app/leaderboard', icon: Medal },
]

const socialItems = [
  { title: 'Players', url: '/app/players', icon: Users },
  { title: 'Friends', url: '/app/friends', icon: UserPlus },
  { title: 'Online Players', url: '/app/online-players', icon: Eye },
  { title: 'Chat', url: '/app/chat', icon: MessageCircle },
  { title: 'Forum', url: '/app/forum', icon: MessageSquare },
  { title: 'Articles', url: '/app/articles', icon: FileText },
]

const otherItems = [
  { title: 'Notifications', url: '/app/notifications', icon: Bell },
  { title: 'Support', url: '/support', icon: LifeBuoy },
  { title: 'Settings', url: '/app/settings', icon: Settings },
]

const adminItems = [
  { title: 'Bot Management', url: '/app/admin/bots', icon: Bot, requiredPage: 'bots' },
  { title: 'Container Test', url: '/app/admin/container-test', icon: Container, requiredPage: 'container_test' },
  { title: 'Notifications', url: '/app/admin/notifications', icon: Megaphone, requiredPage: 'notifications' },
  { title: 'Debug', url: '/app/admin/debug', icon: Bug, requiredPage: 'debug' },
  { title: 'Categories', url: '/app/admin/categories', icon: FolderOpen, requiredPage: 'categories' },
  { title: 'Tickets', url: '/app/admin/tickets', icon: Ticket, requiredPage: 'tickets' },
  { title: 'Stats', url: '/app/admin/stats', icon: BarChart3, requiredPage: 'stats' },
  { title: 'Roles', url: '/app/admin/roles', icon: Shield, requiredPage: 'roles' },
]

const devItems = [{ title: 'Dev Tools', url: '/app/dev', icon: Wrench }]

const isDev = process.env.NODE_ENV === 'development'

interface AppSidebarProps {
  user: {
    ingameNick?: string
    permissions: ResolvedPermissions
    skin?: { name?: string; color_body?: number; color_feet?: number }
  }
}

const chatFetcher = (url: string) =>
  fetch(url, { credentials: 'include' }).then((r) => (r.ok ? r.json() : null))

export function AppSidebar({ user }: AppSidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const { isMobile, setOpenMobile } = useSidebar()
  const { unreadCount } = useNotifications()
  const [mounted, setMounted] = useState(false)
  const [chatMentions, setChatMentions] = useState(0)

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
        <Link href="/app" className="flex items-center gap-2">
          <span className="text-xl font-bold">{APP_NAME}</span>
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
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Games</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {gameItems.map((item) => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton asChild isActive={pathname.startsWith(item.url)}>
                    <Link href={item.url} onClick={handleNavClick}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Community</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {socialItems.map((item) => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton asChild isActive={pathname.startsWith(item.url)}>
                    <Link href={item.url} onClick={handleNavClick}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
              {activeChat && (
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={pathname.startsWith('/app/ingame-chat')}>
                    <Link
                      href={`/app/ingame-chat?sessionId=${activeChat.sessionId}`}
                      onClick={handleNavClick}
                    >
                      <Gamepad2 className="h-4 w-4" />
                      <span>Ingame Chat</span>
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

        {(user.permissions.isAdmin || user.permissions.adminPages.length > 0) && (
          <SidebarGroup>
            <SidebarGroupLabel>Admin</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {adminItems
                  .filter((item) => user.permissions.isAdmin || user.permissions.adminPages.includes(item.requiredPage))
                  .map((item) => (
                    <SidebarMenuItem key={item.url}>
                      <SidebarMenuButton asChild isActive={pathname.startsWith(item.url)}>
                        <Link href={item.url} onClick={handleNavClick}>
                          <item.icon className="h-4 w-4" />
                          <span>{item.title}</span>
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
            <SidebarGroupLabel>Development</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {devItems.map((item) => (
                  <SidebarMenuItem key={item.url}>
                    <SidebarMenuButton asChild isActive={pathname.startsWith(item.url)}>
                      <Link href={item.url} onClick={handleNavClick}>
                        <item.icon className="h-4 w-4" />
                        <span>{item.title}</span>
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
          {otherItems.map((item) => (
            <SidebarMenuItem key={item.url}>
              <SidebarMenuButton asChild isActive={pathname.startsWith(item.url)}>
                <Link href={item.url} onClick={handleNavClick}>
                  <item.icon className="h-4 w-4" />
                  <span>{item.title}</span>
                </Link>
              </SidebarMenuButton>
              {item.url === '/app/notifications' && mounted && unreadCount > 0 && (
                <SidebarMenuBadge className="bg-destructive text-destructive-foreground">
                  {unreadCount > 9 ? '9+' : unreadCount}
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
                    <RoleBadge role={user.permissions.primaryRole} className="text-[10px] px-1 py-0" />
                  </div>
                  <ChevronsUpDown className="ml-auto h-4 w-4 shrink-0 opacity-50" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent side="top" align="start" className="w-56">
                <DropdownMenuItem asChild>
                  <Link href="/app/settings" onClick={handleNavClick}>
                    <Settings className="mr-2 h-4 w-4" />
                    Settings
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout}>
                  <LogOut className="mr-2 h-4 w-4" />
                  Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}
