'use client'

import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { useTranslations } from 'next-intl'

type StatusStyle = {
  variant: 'default' | 'secondary' | 'destructive' | 'outline'
  className?: string
}

const STYLE_MAP: Record<string, StatusStyle> = {
  // Game statuses
  waiting: { variant: 'outline', className: 'border-yellow-500/50 text-yellow-600 dark:text-yellow-400' },
  ready: { variant: 'outline', className: 'border-blue-500/50 text-blue-600 dark:text-blue-400' },
  in_progress: { variant: 'default', className: 'bg-blue-600 hover:bg-blue-600' },
  completed: { variant: 'default', className: 'bg-green-600 hover:bg-green-600' },
  cancelled: { variant: 'secondary' },

  // Verification statuses
  pending: { variant: 'outline', className: 'border-yellow-500/50 text-yellow-600 dark:text-yellow-400' },
  active: { variant: 'default', className: 'bg-blue-600 hover:bg-blue-600' },
  success: { variant: 'default', className: 'bg-green-600 hover:bg-green-600' },
  failed: { variant: 'destructive' },
  expired: { variant: 'secondary' },

  // Team statuses
  not_ready: { variant: 'outline' },
  playing: { variant: 'default', className: 'bg-blue-600 hover:bg-blue-600' },
  winner: { variant: 'default', className: 'bg-green-600 hover:bg-green-600' },
  loser: { variant: 'secondary' },

  // Bot statuses
  starting: { variant: 'outline', className: 'border-yellow-500/50 text-yellow-600 dark:text-yellow-400' },
  running: { variant: 'default', className: 'bg-green-600 hover:bg-green-600' },
  stopping: { variant: 'outline', className: 'border-orange-500/50 text-orange-600 dark:text-orange-400' },
  stopped: { variant: 'secondary' },
  error: { variant: 'destructive' },

  // Support statuses
  open: { variant: 'outline', className: 'border-blue-500/50 text-blue-600 dark:text-blue-400' },
  waiting_for_user: { variant: 'outline', className: 'border-yellow-500/50 text-yellow-600 dark:text-yellow-400' },
  resolved: { variant: 'default', className: 'bg-green-600 hover:bg-green-600' },
  closed: { variant: 'secondary' },
  rejected: { variant: 'destructive' },

  // Priority
  low: { variant: 'outline' },
  medium: { variant: 'outline', className: 'border-yellow-500/50 text-yellow-600 dark:text-yellow-400' },
  high: { variant: 'outline', className: 'border-orange-500/50 text-orange-600 dark:text-orange-400' },
  critical: { variant: 'destructive' },

  // Player
  online: { variant: 'default', className: 'bg-green-600 hover:bg-green-600' },
  offline: { variant: 'secondary' },
  verified: { variant: 'default', className: 'bg-green-600 hover:bg-green-600' },

  // Roles
  admin: { variant: 'default', className: 'bg-red-600 hover:bg-red-600' },
  moderator: { variant: 'default', className: 'bg-blue-600 hover:bg-blue-600' },
  tester: { variant: 'default', className: 'bg-purple-600 hover:bg-purple-600' },

  // Misc
  solo: { variant: 'outline' },
  team: { variant: 'outline', className: 'border-purple-500/50 text-purple-600 dark:text-purple-400' },
  multiplayer: { variant: 'outline', className: 'border-purple-500/50 text-purple-600 dark:text-purple-400' },
  published: { variant: 'default', className: 'bg-green-600 hover:bg-green-600' },
  draft: { variant: 'secondary' },
}

const I18N_KEY: Record<string, string> = {
  waiting: 'status.waiting',
  ready: 'status.ready',
  in_progress: 'status.inProgress',
  completed: 'status.completed',
  cancelled: 'status.cancelled',
  pending: 'status.pending',
  active: 'status.active',
  success: 'status.success',
  failed: 'status.failed',
  expired: 'status.expired',
  not_ready: 'status.notReady',
  playing: 'status.playing',
  winner: 'status.winner',
  loser: 'status.loser',
  starting: 'status.starting',
  running: 'status.running',
  stopping: 'status.stopping',
  stopped: 'status.stopped',
  error: 'status.error',
  open: 'status.open',
  waiting_for_user: 'status.waitingForUser',
  resolved: 'status.resolved',
  closed: 'status.closed',
  rejected: 'status.rejected',
  low: 'priority.low',
  medium: 'priority.medium',
  high: 'priority.high',
  critical: 'priority.critical',
  online: 'status.online',
  offline: 'status.offline',
  verified: 'status.verified',
  admin: 'roles.admin',
  moderator: 'roles.moderator',
  tester: 'roles.tester',
  solo: 'status.solo',
  team: 'status.team',
  multiplayer: 'status.multiplayer',
  published: 'status.published',
  draft: 'status.draft',
}

interface StatusBadgeProps {
  status: string
  className?: string
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const t = useTranslations('common')

  if (!status) return null

  const style = STYLE_MAP[status]
  const i18nKey = I18N_KEY[status]
  const label = i18nKey
    ? t(i18nKey)
    : status.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())

  if (!style) {
    return <Badge variant="outline" className={className}>{label}</Badge>
  }

  return (
    <Badge
      variant={style.variant}
      className={cn(style.className, className)}
    >
      {label}
    </Badge>
  )
}

export function RoleBadge({
  role,
  className,
}: {
  role?: string | { name?: string; displayName: string; badgeColor: string; textColor: string } | null
  className?: string
}) {
  const t = useTranslations('common')

  if (!role) return null

  // Dynamic role object from permissions system
  if (typeof role === 'object') {
    return (
      <Badge
        className={cn(className)}
        style={{ backgroundColor: role.badgeColor, color: role.textColor }}
      >
        {role.displayName}
      </Badge>
    )
  }

  // Default role — show "Member"
  if (role === 'player') {
    return <Badge variant="outline" className={cn('text-muted-foreground', className)}>{t('roles.member')}</Badge>
  }

  return <StatusBadge status={role} className={className} />
}
