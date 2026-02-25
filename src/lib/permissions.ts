import type { PayloadRequest } from 'payload'
import { ALL_PAGE_PERMISSIONS } from '@/collections/Roles'

export interface RolePrimaryDisplay {
  name: string
  displayName: string
  badgeColor: string
  textColor: string
}

export interface ResolvedPermissions {
  isAdmin: boolean
  pages: string[]
  articles: string[]
  support: string[]
  forum: string[]
  games: string[]
  adminPages: string[]
  primaryRole: RolePrimaryDisplay | null
}

const ADMIN_PERMISSIONS: ResolvedPermissions = {
  isAdmin: true,
  pages: [...ALL_PAGE_PERMISSIONS],
  articles: ['create', 'edit', 'delete', 'view_drafts'],
  support: ['view_all', 'reply', 'change_status', 'delete'],
  forum: ['view_hidden', 'edit_any', 'delete_any', 'pin', 'lock'],
  games: ['edit_any', 'delete_any', 'manage_categories'],
  adminPages: ['bots', 'container_test', 'notifications', 'debug', 'categories', 'tickets', 'stats', 'roles'],
  primaryRole: { name: 'admin', displayName: 'Admin', badgeColor: '#dc2626', textColor: '#ffffff' },
}

const EMPTY_PERMISSIONS: ResolvedPermissions = {
  isAdmin: false,
  pages: [],
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
  isDefault?: boolean
  permissions: {
    pages?: string[] | null
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

/** Find the default role from cache */
function getDefaultRole(): CachedRole | null {
  for (const role of roleCache.values()) {
    if (role.isDefault) return role
  }
  return null
}

export function isAdmin(user: { roles?: string } | null | undefined): boolean {
  return user?.roles === 'admin'
}

function mergeRolePermissions(role: CachedRole, sets: {
  pages: Set<string>
  articles: Set<string>
  support: Set<string>
  forum: Set<string>
  games: Set<string>
  adminPages: Set<string>
}) {
  for (const p of role.permissions?.pages || []) sets.pages.add(p)
  for (const p of role.permissions?.articles || []) sets.articles.add(p)
  for (const p of role.permissions?.support || []) sets.support.add(p)
  for (const p of role.permissions?.forum || []) sets.forum.add(p)
  for (const p of role.permissions?.games || []) sets.games.add(p)
  for (const p of role.permissions?.adminPages || []) sets.adminPages.add(p)
}

export async function resolvePermissions(
  user: { roles?: string; assignedRoles?: (string | object)[] } | null | undefined,
  req: PayloadRequest,
): Promise<ResolvedPermissions> {
  if (!user) return EMPTY_PERMISSIONS
  if (user.roles === 'admin') return ADMIN_PERMISSIONS

  await ensureRoleCachePopulated(req)

  const sets = {
    pages: new Set<string>(),
    articles: new Set<string>(),
    support: new Set<string>(),
    forum: new Set<string>(),
    games: new Set<string>(),
    adminPages: new Set<string>(),
  }
  let highestPriority = -Infinity
  let primaryRole: RolePrimaryDisplay | null = null

  // Always include the default role for non-admin users
  const defaultRole = getDefaultRole()
  if (defaultRole) {
    mergeRolePermissions(defaultRole, sets)
    highestPriority = defaultRole.priority
    primaryRole = {
      name: defaultRole.name,
      displayName: defaultRole.displayName,
      badgeColor: defaultRole.badgeColor,
      textColor: defaultRole.textColor,
    }
  }

  // Merge assigned roles
  const roleRefs = user.assignedRoles
  if (roleRefs && roleRefs.length > 0) {
    for (const ref of roleRefs) {
      const roleId = typeof ref === 'string' ? ref : (ref as { id: string }).id
      const role = roleCache.get(roleId)
      if (!role) continue

      mergeRolePermissions(role, sets)

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
  }

  return {
    isAdmin: false,
    pages: [...sets.pages],
    articles: [...sets.articles],
    support: [...sets.support],
    forum: [...sets.forum],
    games: [...sets.games],
    adminPages: [...sets.adminPages],
    primaryRole,
  }
}

type PermissionCategory = 'pages' | 'articles' | 'support' | 'forum' | 'games' | 'adminPages'

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

export async function hasPageAccess(req: PayloadRequest, page: string): Promise<boolean> {
  return hasPermission(req, 'pages', page)
}

export async function hasAnyAdminAccess(req: PayloadRequest): Promise<boolean> {
  const user = req.user as { roles?: string; assignedRoles?: (string | object)[] } | null
  if (!user) return false
  if (user.roles === 'admin') return true

  const perms = await resolvePermissions(user, req)
  return perms.adminPages.length > 0
}
