import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

const STATUS_MAP: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline'; className?: string }> = {
  // Game statuses
  waiting: { label: 'Waiting', variant: 'outline', className: 'border-yellow-500/50 text-yellow-600 dark:text-yellow-400' },
  ready: { label: 'Ready', variant: 'outline', className: 'border-blue-500/50 text-blue-600 dark:text-blue-400' },
  in_progress: { label: 'In Progress', variant: 'default', className: 'bg-blue-600 hover:bg-blue-600' },
  completed: { label: 'Completed', variant: 'default', className: 'bg-green-600 hover:bg-green-600' },
  cancelled: { label: 'Cancelled', variant: 'secondary' },

  // Verification statuses
  pending: { label: 'Pending', variant: 'outline', className: 'border-yellow-500/50 text-yellow-600 dark:text-yellow-400' },
  active: { label: 'Active', variant: 'default', className: 'bg-blue-600 hover:bg-blue-600' },
  success: { label: 'Success', variant: 'default', className: 'bg-green-600 hover:bg-green-600' },
  failed: { label: 'Failed', variant: 'destructive' },
  expired: { label: 'Expired', variant: 'secondary' },

  // Team statuses
  not_ready: { label: 'Not Ready', variant: 'outline' },
  playing: { label: 'Playing', variant: 'default', className: 'bg-blue-600 hover:bg-blue-600' },
  winner: { label: 'Winner', variant: 'default', className: 'bg-green-600 hover:bg-green-600' },
  loser: { label: 'Lost', variant: 'secondary' },

  // Bot statuses
  starting: { label: 'Starting', variant: 'outline', className: 'border-yellow-500/50 text-yellow-600 dark:text-yellow-400' },
  running: { label: 'Running', variant: 'default', className: 'bg-green-600 hover:bg-green-600' },
  stopping: { label: 'Stopping', variant: 'outline', className: 'border-orange-500/50 text-orange-600 dark:text-orange-400' },
  stopped: { label: 'Stopped', variant: 'secondary' },
  error: { label: 'Error', variant: 'destructive' },

  // Support statuses
  open: { label: 'Open', variant: 'outline', className: 'border-blue-500/50 text-blue-600 dark:text-blue-400' },
  waiting_for_user: { label: 'Awaiting Reply', variant: 'outline', className: 'border-yellow-500/50 text-yellow-600 dark:text-yellow-400' },
  resolved: { label: 'Resolved', variant: 'default', className: 'bg-green-600 hover:bg-green-600' },
  closed: { label: 'Closed', variant: 'secondary' },
  rejected: { label: 'Rejected', variant: 'destructive' },

  // Priority
  low: { label: 'Low', variant: 'outline' },
  medium: { label: 'Medium', variant: 'outline', className: 'border-yellow-500/50 text-yellow-600 dark:text-yellow-400' },
  high: { label: 'High', variant: 'outline', className: 'border-orange-500/50 text-orange-600 dark:text-orange-400' },
  critical: { label: 'Critical', variant: 'destructive' },

  // Player
  online: { label: 'Online', variant: 'default', className: 'bg-green-600 hover:bg-green-600' },
  offline: { label: 'Offline', variant: 'secondary' },
  verified: { label: 'Verified', variant: 'default', className: 'bg-green-600 hover:bg-green-600' },

  // Roles
  admin: { label: 'Admin', variant: 'default', className: 'bg-red-600 hover:bg-red-600' },
  moderator: { label: 'Moderator', variant: 'default', className: 'bg-blue-600 hover:bg-blue-600' },
  tester: { label: 'Tester', variant: 'default', className: 'bg-purple-600 hover:bg-purple-600' },

  // Misc
  solo: { label: 'Solo', variant: 'outline' },
  team: { label: 'Team', variant: 'outline', className: 'border-purple-500/50 text-purple-600 dark:text-purple-400' },
  multiplayer: { label: 'Multiplayer', variant: 'outline', className: 'border-purple-500/50 text-purple-600 dark:text-purple-400' },
  published: { label: 'Published', variant: 'default', className: 'bg-green-600 hover:bg-green-600' },
  draft: { label: 'Draft', variant: 'secondary' },
}

interface StatusBadgeProps {
  status: string
  className?: string
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  if (!status) return null

  const config = STATUS_MAP[status]

  if (!config) {
    // Fallback: capitalize and replace underscores
    const label = status.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
    return <Badge variant="outline" className={className}>{label}</Badge>
  }

  return (
    <Badge
      variant={config.variant}
      className={cn(config.className, className)}
    >
      {config.label}
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

  // Legacy string-based fallback
  if (role === 'player') return null
  return <StatusBadge status={role} className={className} />
}
