'use client'

import { Suspense, useState, useMemo, useCallback } from 'react'
import useSWR from 'swr'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { DebouncedInput } from '@/components/ui/debounced-input'
import { TeeAvatarWithFallback, getDDNetSkinUrl } from '@/components/tee/TeeAvatar'
import { RoleBadge } from '@/components/ui/status-badge'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import {
  Shield,
  Plus,
  Pencil,
  Trash2,
  Save,
  X,
  Search,
  Users,
  Loader2,
  Globe,
  UserPlus,
} from 'lucide-react'

const fetcher = (url: string) => fetch(url).then((r) => r.json())

// Permission categories with their options — mirrors Roles.ts schema
const PERMISSION_GROUPS = {
  pages: {
    label: 'Page Access',
    options: [
      { value: 'app_access', label: 'App Access' },
      { value: 'bingo', label: 'Bingo' },
      { value: 'race', label: 'Race' },
      { value: 'leaderboard', label: 'Leaderboard' },
      { value: 'players', label: 'Players' },
      { value: 'friends', label: 'Friends' },
      { value: 'online_players', label: 'Online Players' },
      { value: 'chat', label: 'Chat' },
      { value: 'forum', label: 'Forum' },
      { value: 'articles', label: 'Articles' },
      { value: 'notifications', label: 'Notifications' },
      { value: 'support', label: 'Support' },
      { value: 'ingame_chat', label: 'Ingame Chat' },
    ],
  },
  articles: {
    label: 'Articles',
    options: [
      { value: 'create', label: 'Create Articles' },
      { value: 'edit', label: 'Edit Articles' },
      { value: 'delete', label: 'Delete Articles' },
      { value: 'view_drafts', label: 'View Drafts' },
    ],
  },
  support: {
    label: 'Support',
    options: [
      { value: 'view_all', label: 'View All Tickets' },
      { value: 'reply', label: 'Reply to Tickets' },
      { value: 'change_status', label: 'Change Ticket Status' },
      { value: 'delete', label: 'Delete Tickets' },
    ],
  },
  forum: {
    label: 'Forum',
    options: [
      { value: 'view_hidden', label: 'View Hidden Posts' },
      { value: 'edit_any', label: 'Edit Any Post' },
      { value: 'delete_any', label: 'Delete Any Post' },
      { value: 'pin', label: 'Pin Posts' },
      { value: 'lock', label: 'Lock Posts' },
    ],
  },
  games: {
    label: 'Games',
    options: [
      { value: 'edit_any', label: 'Edit Any Game' },
      { value: 'delete_any', label: 'Delete Any Game' },
      { value: 'manage_categories', label: 'Manage Categories' },
    ],
  },
  adminPages: {
    label: 'Admin Pages',
    options: [
      { value: 'bots', label: 'Bot Management' },
      { value: 'container_test', label: 'Container Test' },
      { value: 'notifications', label: 'Send Notifications' },
      { value: 'debug', label: 'Debug Tools' },
      { value: 'categories', label: 'Categories' },
      { value: 'tickets', label: 'Tickets' },
      { value: 'stats', label: 'Stats' },
      { value: 'roles', label: 'Role Management' },
      { value: 'manage_users', label: 'Manage Users' },
    ],
  },
} as const

type PermCategory = keyof typeof PERMISSION_GROUPS

interface RoleFormData {
  name: string
  displayName: string
  priority: number
  badgeColor: string
  textColor: string
  permissions: Record<PermCategory, string[]>
}

const emptyForm: RoleFormData = {
  name: '',
  displayName: '',
  priority: 0,
  badgeColor: '#6b7280',
  textColor: '#ffffff',
  permissions: { pages: [], articles: [], support: [], forum: [], games: [], adminPages: [] },
}

// ============================================================================
// Skeleton
// ============================================================================

function RolesPageSkeleton() {
  return (
    <div className="space-y-6 max-w-3xl mx-auto animate-in fade-in duration-300">
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-24" />
        <Skeleton className="h-10 w-28 rounded-md" />
      </div>
      {/* Admin card skeleton */}
      <div className="rounded-xl border border-red-500/20 p-4 flex items-center gap-3">
        <Skeleton className="h-5 w-5 rounded" />
        <div className="flex-1 space-y-1">
          <Skeleton className="h-5 w-32" />
        </div>
      </div>
      {/* Role card skeletons */}
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="rounded-xl border p-4 space-y-2">
          <div className="flex items-center gap-3">
            <div className="flex-1 space-y-2">
              <div className="flex items-center gap-2">
                <Skeleton className="h-5 w-28" />
                <Skeleton className="h-5 w-16 rounded-full" />
                <Skeleton className="h-4 w-20" />
              </div>
              <Skeleton className="h-3 w-40" />
            </div>
            <div className="flex gap-1">
              <Skeleton className="h-8 w-8 rounded-md" />
              <Skeleton className="h-8 w-8 rounded-md" />
              <Skeleton className="h-8 w-8 rounded-md" />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

// ============================================================================
// Main Component
// ============================================================================

function RolesContent() {
  const {
    data: rolesData,
    isLoading,
    mutate: mutateRoles,
  } = useSWR('/api/roles?sort=-priority&limit=50', fetcher)
  const roles: any[] = rolesData?.docs || []

  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<RoleFormData>(emptyForm)
  const [originalForm, setOriginalForm] = useState<RoleFormData>(emptyForm)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)
  // (no collapsible sections — all permission groups shown flat)

  // User assignment (inside edit form)
  const [userSearchQuery, setUserSearchQuery] = useState('')
  const { data: searchData, isLoading: isSearching } = useSWR(
    editingId && editingId !== 'new' && userSearchQuery
      ? `/api/players/search?q=${encodeURIComponent(userSearchQuery)}&limit=5`
      : null,
    fetcher,
  )
  const searchResults: any[] = searchData?.registered || []

  const {
    data: roleUsersData,
    isLoading: isLoadingUsers,
    mutate: mutateRoleUsers,
  } = useSWR(
    editingId && editingId !== 'new'
      ? `/api/users?where[assignedRoles][contains]=${editingId}&limit=50&depth=1`
      : null,
    fetcher,
  )
  const roleUsers: any[] = roleUsersData?.docs || []

  // Filter out already-assigned users from search results
  const assignedUserIds = useMemo(() => new Set(roleUsers.map((u: any) => u.id)), [roleUsers])
  const filteredSearchResults = useMemo(
    () => searchResults.filter((p: any) => !assignedUserIds.has(p.id)),
    [searchResults, assignedUserIds],
  )

  // Dirty check — compare current form to original
  const isDirty = useMemo(() => {
    if (editingId === 'new') return true
    return JSON.stringify(form) !== JSON.stringify(originalForm)
  }, [form, originalForm, editingId])

  const assignUserToRole = useCallback(
    async (userId: string, player: any) => {
      if (!editingId || editingId === 'new') return

      // Optimistic: add user to list immediately
      const optimisticUser = {
        id: userId,
        ingameNick: player.name,
        username: player.name,
        ingameStats: player.skin ? { skin: { name: player.skin.name } } : undefined,
        _optimistic: true,
      }
      mutateRoleUsers(
        (prev: any) => (prev ? { ...prev, docs: [...prev.docs, optimisticUser] } : prev),
        { revalidate: false },
      )
      setUserSearchQuery('')

      try {
        const userRes = await fetch(`/api/users/${userId}?depth=0`)
        const userData = await userRes.json()
        const currentRoles: string[] = (userData.assignedRoles || []).map((r: any) =>
          typeof r === 'string' ? r : r.id,
        )

        if (currentRoles.includes(editingId)) {
          toast.error('User already has this role')
          mutateRoleUsers() // rollback
          return
        }

        const patchBody: Record<string, unknown> = {
          assignedRoles: [...currentRoles, editingId],
        }
        if (userData.roles && userData.roles !== 'admin' && userData.roles !== 'player') {
          patchBody.roles = 'player'
        }

        const res = await fetch(`/api/users/${userId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(patchBody),
        })
        if (!res.ok) throw new Error('Failed to assign role')
        toast.success('Role assigned')
        mutateRoleUsers()
      } catch (err: unknown) {
        toast.error(err instanceof Error ? err.message : 'Failed to assign')
        mutateRoleUsers() // rollback
      }
    },
    [editingId, mutateRoleUsers],
  )

  const removeUserFromRole = useCallback(
    async (userId: string) => {
      if (!editingId || editingId === 'new') return

      // Optimistic: remove user from list immediately
      mutateRoleUsers(
        (prev: any) =>
          prev ? { ...prev, docs: prev.docs.filter((u: any) => u.id !== userId) } : prev,
        { revalidate: false },
      )

      try {
        const userRes = await fetch(`/api/users/${userId}?depth=0`)
        const userData = await userRes.json()
        const currentRoles: string[] = (userData.assignedRoles || []).map((r: any) =>
          typeof r === 'string' ? r : r.id,
        )

        const patchBody: Record<string, unknown> = {
          assignedRoles: currentRoles.filter((r) => r !== editingId),
        }
        if (userData.roles && userData.roles !== 'admin' && userData.roles !== 'player') {
          patchBody.roles = 'player'
        }

        const res = await fetch(`/api/users/${userId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(patchBody),
        })
        if (!res.ok) throw new Error('Failed to remove role')
        toast.success('Role removed')
        mutateRoleUsers()
      } catch (err: unknown) {
        toast.error(err instanceof Error ? err.message : 'Failed to remove')
        mutateRoleUsers() // rollback
      }
    },
    [editingId, mutateRoleUsers],
  )

  if (isLoading) return <RolesPageSkeleton />


  const startCreate = () => {
    setEditingId('new')
    setForm(emptyForm)
    setOriginalForm(emptyForm)
    setUserSearchQuery('')
  }

  const startEdit = (role: any) => {
    const formData: RoleFormData = {
      name: role.name || '',
      displayName: role.displayName || '',
      priority: role.priority || 0,
      badgeColor: role.badgeColor || '#6b7280',
      textColor: role.textColor || '#ffffff',
      permissions: {
        pages: role.permissions?.pages || [],
        articles: role.permissions?.articles || [],
        support: role.permissions?.support || [],
        forum: role.permissions?.forum || [],
        games: role.permissions?.games || [],
        adminPages: role.permissions?.adminPages || [],
      },
    }
    setEditingId(role.id)
    setForm(formData)
    setOriginalForm(formData)
    setUserSearchQuery('')
  }

  const cancelEdit = () => {
    setEditingId(null)
    setForm(emptyForm)
    setOriginalForm(emptyForm)
    setUserSearchQuery('')
  }

  const togglePermission = (category: PermCategory, value: string) => {
    setForm((prev) => {
      const current = prev.permissions[category]
      const next = current.includes(value)
        ? current.filter((v) => v !== value)
        : [...current, value]
      return { ...prev, permissions: { ...prev.permissions, [category]: next } }
    })
  }

  const handleSave = async () => {
    if (!form.name.trim() || !form.displayName.trim()) {
      toast.error('Name and display name are required')
      return
    }

    setSaving(true)
    const isNew = editingId === 'new'
    const body = {
      name: form.name
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9_-]/g, '_'),
      displayName: form.displayName.trim(),
      priority: form.priority,
      badgeColor: form.badgeColor,
      textColor: form.textColor,
      permissions: form.permissions,
    }

    try {
      if (isNew) {
        const res = await fetch('/api/roles', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
        if (!res.ok) {
          const data = await res.json()
          throw new Error(data.errors?.[0]?.message || 'Failed to create role')
        }
        const data = await res.json()
        const newId = data.doc?.id
        toast.success('Role created')
        // Switch to editing the newly created role
        if (newId) {
          setEditingId(newId)
        }
      } else {
        const res = await fetch(`/api/roles/${editingId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
        if (!res.ok) {
          const data = await res.json()
          throw new Error(data.errors?.[0]?.message || 'Failed to update role')
        }
        toast.success('Role updated')
      }
      // Mark current form as the new baseline (no longer dirty)
      setOriginalForm(form)
      mutateRoles()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (roleId: string) => {
    setDeleting(roleId)

    // Optimistic remove
    mutateRoles(
      (prev: any) =>
        prev ? { ...prev, docs: prev.docs.filter((r: any) => r.id !== roleId) } : prev,
      { revalidate: false },
    )
    if (editingId === roleId) cancelEdit()

    try {
      const res = await fetch(`/api/roles/${roleId}`, { method: 'DELETE' })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.errors?.[0]?.message || 'Failed to delete')
      }
      toast.success('Role deleted')
      mutateRoles()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete role')
      mutateRoles() // rollback
    } finally {
      setDeleting(null)
    }
  }

  // ── Editing / Creating form ──
  if (editingId) {
    const totalPerms = Object.values(form.permissions).reduce((sum, arr) => sum + arr.length, 0)

    return (
      <div className="space-y-6 max-w-2xl mx-auto py-32">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={cancelEdit}>
            <X className="h-4 w-4" />
          </Button>
          <h1 className="text-2xl font-bold">
            {editingId === 'new' ? 'Create Role' : 'Edit Role'}
          </h1>
        </div>

        {/* Badge preview */}
        <Card className="border-dashed">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs text-muted-foreground">Badge Preview</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center gap-3">
            <Badge style={{ backgroundColor: form.badgeColor, color: form.textColor }}>
              {form.displayName || 'Role Name'}
            </Badge>
            <span className="text-sm text-muted-foreground">
              Priority: {form.priority} &middot; {totalPerms} permission
              {totalPerms !== 1 ? 's' : ''}
            </span>
          </CardContent>
        </Card>

        {/* Basic fields */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Role Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Name (identifier)</Label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="moderator"
                  disabled={editingId !== 'new'}
                />
              </div>
              <div>
                <Label>Display Name</Label>
                <Input
                  value={form.displayName}
                  onChange={(e) => setForm((f) => ({ ...f, displayName: e.target.value }))}
                  placeholder="Moderator"
                />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>Priority</Label>
                <Input
                  type="number"
                  value={form.priority}
                  onChange={(e) => setForm((f) => ({ ...f, priority: Number(e.target.value) }))}
                />
              </div>
              <div>
                <Label>Badge Color</Label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    value={form.badgeColor}
                    onChange={(e) => setForm((f) => ({ ...f, badgeColor: e.target.value }))}
                    className="h-9 w-12 rounded border cursor-pointer"
                  />
                  <Input
                    value={form.badgeColor}
                    onChange={(e) => setForm((f) => ({ ...f, badgeColor: e.target.value }))}
                    className="flex-1"
                  />
                </div>
              </div>
              <div>
                <Label>Text Color</Label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    value={form.textColor}
                    onChange={(e) => setForm((f) => ({ ...f, textColor: e.target.value }))}
                    className="h-9 w-12 rounded border cursor-pointer"
                  />
                  <Input
                    value={form.textColor}
                    onChange={(e) => setForm((f) => ({ ...f, textColor: e.target.value }))}
                    className="flex-1"
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Permissions */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Permissions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {(
              Object.entries(PERMISSION_GROUPS) as [
                PermCategory,
                (typeof PERMISSION_GROUPS)[PermCategory],
              ][]
            ).map(([category, group]) => {
              const activeCount = form.permissions[category].length

              return (
                <div key={category} className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{group.label}</span>
                    {activeCount > 0 && (
                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                        {activeCount}
                      </Badge>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {group.options.map((opt) => {
                      const active = form.permissions[category].includes(opt.value)
                      return (
                        <button
                          key={opt.value}
                          onClick={() => togglePermission(category, opt.value)}
                          className={cn(
                            'px-3 py-1.5 rounded-md text-xs font-medium border transition-colors',
                            active
                              ? 'bg-primary text-primary-foreground border-primary'
                              : 'bg-muted/30 text-muted-foreground border-border hover:bg-muted/50',
                          )}
                        >
                          {opt.label}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </CardContent>
        </Card>

        {/* User Assignment (only for existing roles) */}
        {editingId !== 'new' && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Users className="h-4 w-4" />
                Assigned Users
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {isLoadingUsers ? (
                <div className="flex flex-wrap gap-2">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} className="h-7 w-24 rounded-full" />
                  ))}
                </div>
              ) : roleUsers.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {roleUsers.map((user: any) => (
                    <Badge
                      key={user.id}
                      variant="secondary"
                      className="flex items-center gap-1.5 pr-1"
                    >
                      <TeeAvatarWithFallback
                        skinUrl={
                          user.ingameStats?.skin?.name
                            ? getDDNetSkinUrl(user.ingameStats.skin.name)
                            : undefined
                        }
                        size="xs"
                      />
                      <span>{user.ingameNick || user.username}</span>
                      <button
                        onClick={() => removeUserFromRole(user.id)}
                        className="ml-0.5 rounded-full p-0.5 hover:bg-muted"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">No users assigned</p>
              )}

              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <DebouncedInput
                  onDebouncedChange={setUserSearchQuery}
                  placeholder="Search players to assign..."
                  className="pl-10"
                  debounce={300}
                />
              </div>

              {userSearchQuery && isSearching && (
                <div className="border rounded-lg divide-y">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-3 px-3 py-2">
                      <Skeleton className="h-6 w-6 rounded-full" />
                      <Skeleton className="h-4 w-28" />
                      <Skeleton className="h-4 w-14 rounded-full ml-auto" />
                    </div>
                  ))}
                </div>
              )}

              {userSearchQuery && !isSearching && filteredSearchResults.length > 0 && (
                <div className="border rounded-lg divide-y max-h-60 overflow-y-auto">
                  {filteredSearchResults.map((player: any) => (
                    <button
                      key={player.id}
                      onClick={() => assignUserToRole(player.id, player)}
                      className="flex items-center gap-3 w-full px-3 py-2 text-left hover:bg-muted/50 transition-colors"
                    >
                      <TeeAvatarWithFallback
                        skinUrl={player.skin?.name ? getDDNetSkinUrl(player.skin.name) : undefined}
                        size="xs"
                      />
                      <span className="text-sm font-medium flex-1">{player.name}</span>
                      <RoleBadge
                        role={(player as any).primaryRole || player.roles}
                        className="text-[10px] px-1.5 py-0"
                      />
                      <UserPlus className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    </button>
                  ))}
                </div>
              )}

              {userSearchQuery && !isSearching && filteredSearchResults.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-2">No players found</p>
              )}
            </CardContent>
          </Card>
        )}

        {/* Save */}
        <Button onClick={handleSave} disabled={saving || !isDirty} className="w-full" size="lg">
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              {editingId === 'new' ? 'Create Role' : 'Save Changes'}
            </>
          )}
        </Button>
      </div>
    )
  }

  // ── Role list ──
  // Separate default role from custom roles
  const defaultRole = roles.find((r: any) => r.isDefault)
  const customRoles = roles.filter((r: any) => !r.isDefault)

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Roles</h1>
        <Button onClick={startCreate}>
          <Plus className="h-4 w-4 mr-2" />
          New Role
        </Button>
      </div>

      {/* Admin role (system) */}
      <Card className="border-red-500/20 hover:border-red-500/40 transition-colors">
        <CardContent className="p-4 flex items-center gap-3">
          <Shield className="h-5 w-5 text-red-500 shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-sm">Admin</span>
              <Badge style={{ backgroundColor: '#dc2626', color: '#ffffff' }}>Admin</Badge>
              <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                System
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Full access to all features and pages
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Default User role */}
      {defaultRole && (
        <Card
          className="hover:border-muted-foreground/30 transition-colors"
          style={{ borderColor: `${defaultRole.badgeColor}20` }}
        >
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Globe className="h-5 w-5 text-muted-foreground shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-sm">{defaultRole.displayName}</span>
                  <Badge
                    style={{
                      backgroundColor: defaultRole.badgeColor,
                      color: defaultRole.textColor,
                    }}
                  >
                    {defaultRole.displayName}
                  </Badge>
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                    Default
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Applied to all users &middot; {(defaultRole.permissions?.pages || []).length}{' '}
                  pages enabled
                </p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <Button variant="ghost" size="sm" onClick={() => startEdit(defaultRole)}>
                  <Pencil className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Dynamic roles */}
      {customRoles.length === 0 && !defaultRole ? (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            <Shield className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p>No roles created yet.</p>
            <p className="text-xs mt-1">Create roles to manage permissions for your users.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {customRoles.map((role: any) => {
            const permCount = [
              ...(role.permissions?.pages || []),
              ...(role.permissions?.articles || []),
              ...(role.permissions?.support || []),
              ...(role.permissions?.forum || []),
              ...(role.permissions?.games || []),
              ...(role.permissions?.adminPages || []),
            ].length

            return (
              <Card
                key={role.id}
                className={cn(
                  'hover:border-muted-foreground/30 transition-colors',
                  role._optimistic && 'opacity-60',
                )}
                style={{ borderColor: `${role.badgeColor}20` }}
              >
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-sm">{role.displayName}</span>
                        <Badge style={{ backgroundColor: role.badgeColor, color: role.textColor }}>
                          {role.displayName}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          Priority: {role.priority} &middot; {permCount} perm
                          {permCount !== 1 ? 's' : ''}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {role.name}
                        {role.permissions?.adminPages?.length > 0 && (
                          <> &middot; Admin: {role.permissions.adminPages.join(', ')}</>
                        )}
                        {role.permissions?.pages?.length > 0 && (
                          <> &middot; {role.permissions.pages.length} pages</>
                        )}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button variant="ghost" size="sm" onClick={() => startEdit(role)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            disabled={deleting === role.id}
                            className="text-destructive hover:text-destructive"
                          >
                            {deleting === role.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Trash2 className="h-4 w-4" />
                            )}
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>
                              Delete role &ldquo;{role.displayName}&rdquo;?
                            </AlertDialogTitle>
                            <AlertDialogDescription>
                              This will remove the role and its permissions from all assigned users.
                              This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDelete(role.id)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ============================================================================
// Page Export
// ============================================================================

export default function AdminRolesPage() {
  return (
    <Suspense fallback={<RolesPageSkeleton />}>
      <RolesContent />
    </Suspense>
  )
}
