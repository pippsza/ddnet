import type { PayloadRequest } from 'payload'

export interface RolePrimaryDisplay {
  name: string
  displayName: string
  badgeColor: string
  textColor: string
}

export interface ResolvedPermissions {
  isAdmin: boolean
  articles: string[]
  support: string[]
  forum: string[]
  games: string[]
  adminPages: string[]
  primaryRole: RolePrimaryDisplay | null
}

const ADMIN_PERMISSIONS: ResolvedPermissions = {
  isAdmin: true,
  articles: ['create', 'edit', 'delete', 'view_drafts'],
  support: ['view_all', 'reply', 'change_status', 'delete'],
  forum: ['view_hidden', 'edit_any', 'delete_any', 'pin', 'lock'],
  games: ['edit_any', 'delete_any', 'manage_categories'],
  adminPages: ['bots', 'container_test', 'notifications', 'debug', 'categories', 'tickets', 'stats', 'roles'],
  primaryRole: { name: 'admin', displayName: 'Admin', badgeColor: '#dc2626', textColor: '#ffffff' },
}

const EMPTY_PERMISSIONS: ResolvedPermissions = {
  isAdmin: false,
  articles: [],
  support: [],
  forum: [],
  games: [],
  adminPages: [],
  primaryRole: null,
}

// In-memory role cache — populated once, invalidated on role changes
export interface CachedRole {
  id: string
  name: string
  displayName: string
  priority: number
  badgeColor: string
  textColor: string
  permissions: {
    articles?: string[] | null
    support?: string[] | null
    forum?: string[] | null
    games?: string[] | null
    adminPages?: string[] | null
  }
}

const roleCache = new Map<string, CachedRole>()
let cachePopulated = false

export function invalidateRoleCache() {
  roleCache.clear()
  cachePopulated = false
}

/** Synchronous lookup from cache — returns null if cache not yet populated or role not found */
export function getRoleCacheEntry(roleId: string): CachedRole | null {
  return roleCache.get(roleId) || null
}

export function isRoleCachePopulated(): boolean {
  return cachePopulated
}

export async function ensureRoleCachePopulated(req: PayloadRequest): Promise<void> {
  if (cachePopulated) return

  const result = await req.payload.find({
    collection: 'roles',
    limit: 100,
    depth: 0,
  })

  for (const doc of result.docs) {
    const role = doc as unknown as CachedRole
    roleCache.set(doc.id, role)
  }
  cachePopulated = true
}

export function isAdmin(user: { roles?: string } | null | undefined): boolean {
  return user?.roles === 'admin'
}

export async function resolvePermissions(
  user: { roles?: string; assignedRoles?: (string | object)[] } | null | undefined,
  req: PayloadRequest,
): Promise<ResolvedPermissions> {
  if (!user) return EMPTY_PERMISSIONS
  if (user.roles === 'admin') return ADMIN_PERMISSIONS

  const roleRefs = user.assignedRoles
  if (!roleRefs || roleRefs.length === 0) return EMPTY_PERMISSIONS

  await ensureRoleCachePopulated(req)

  const articles = new Set<string>()
  const support = new Set<string>()
  const forum = new Set<string>()
  const games = new Set<string>()
  const adminPages = new Set<string>()
  let highestPriority = -Infinity
  let primaryRole: RolePrimaryDisplay | null = null

  for (const ref of roleRefs) {
    const roleId = typeof ref === 'string' ? ref : (ref as { id: string }).id
    const role = roleCache.get(roleId)
    if (!role) continue

    for (const p of role.permissions?.articles || []) articles.add(p)
    for (const p of role.permissions?.support || []) support.add(p)
    for (const p of role.permissions?.forum || []) forum.add(p)
    for (const p of role.permissions?.games || []) games.add(p)
    for (const p of role.permissions?.adminPages || []) adminPages.add(p)

    if (role.priority > highestPriority) {
      highestPriority = role.priority
      primaryRole = {
        name: role.name,
        displayName: role.displayName,
        badgeColor: role.badgeColor,
        textColor: role.textColor,
      }
    }
  }

  return {
    isAdmin: false,
    articles: [...articles],
    support: [...support],
    forum: [...forum],
    games: [...games],
    adminPages: [...adminPages],
    primaryRole,
  }
}

type PermissionCategory = 'articles' | 'support' | 'forum' | 'games' | 'adminPages'

export async function hasPermission(
  req: PayloadRequest,
  category: PermissionCategory,
  permission: string,
): Promise<boolean> {
  const user = req.user as { roles?: string; assignedRoles?: (string | object)[] } | null
  if (!user) return false
  if (user.roles === 'admin') return true

  const perms = await resolvePermissions(user, req)
  return perms[category].includes(permission)
}

export async function hasAnyAdminAccess(req: PayloadRequest): Promise<boolean> {
  const user = req.user as { roles?: string; assignedRoles?: (string | object)[] } | null
  if (!user) return false
  if (user.roles === 'admin') return true

  const perms = await resolvePermissions(user, req)
  return perms.adminPages.length > 0
}
