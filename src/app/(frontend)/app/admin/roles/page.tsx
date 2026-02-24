'use client'

import { useState, useCallback } from 'react'
import useSWR from 'swr'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { DebouncedInput } from '@/components/ui/debounced-input'
import { TeeAvatarWithFallback, getDDNetSkinUrl } from '@/components/tee/TeeAvatar'
import { RoleBadge } from '@/components/ui/status-badge'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import {
  Shield, Plus, Pencil, Trash2, Save, X, Search,
  Users, Loader2, ChevronDown, ChevronUp,
} from 'lucide-react'

const fetcher = (url: string) => fetch(url).then((r) => r.json())

// Permission categories with their options — mirrors Roles.ts schema
const PERMISSION_GROUPS = {
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
  permissions: { articles: [], support: [], forum: [], games: [], adminPages: [] },
}

export default function AdminRolesPage() {
  const { data: rolesData, mutate: mutateRoles } = useSWR('/api/roles?sort=priority&limit=50', fetcher)
  const roles: any[] = rolesData?.docs || []

  const [editingId, setEditingId] = useState<string | null>(null) // null = list mode, 'new' = create
  const [form, setForm] = useState<RoleFormData>(emptyForm)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)

  // User assignment
  const [assignRoleId, setAssignRoleId] = useState<string | null>(null)
  const [userSearchQuery, setUserSearchQuery] = useState('')
  const { data: searchData } = useSWR(
    assignRoleId && userSearchQuery
      ? `/api/players/search?q=${encodeURIComponent(userSearchQuery)}&limit=10`
      : null,
    fetcher,
  )
  const searchResults: any[] = searchData?.registered || []

  // Users with a specific role
  const { data: roleUsersData, mutate: mutateRoleUsers } = useSWR(
    assignRoleId ? `/api/users?where[assignedRoles][contains]=${assignRoleId}&limit=50&depth=1` : null,
    fetcher,
  )
  const roleUsers: any[] = roleUsersData?.docs || []

  const startCreate = () => {
    setEditingId('new')
    setForm(emptyForm)
    setAssignRoleId(null)
  }

  const startEdit = (role: any) => {
    setEditingId(role.id)
    setForm({
      name: role.name || '',
      displayName: role.displayName || '',
      priority: role.priority || 0,
      badgeColor: role.badgeColor || '#6b7280',
      textColor: role.textColor || '#ffffff',
      permissions: {
        articles: role.permissions?.articles || [],
        support: role.permissions?.support || [],
        forum: role.permissions?.forum || [],
        games: role.permissions?.games || [],
        adminPages: role.permissions?.adminPages || [],
      },
    })
    setAssignRoleId(null)
  }

  const cancelEdit = () => {
    setEditingId(null)
    setForm(emptyForm)
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
    try {
      const body = {
        name: form.name.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '_'),
        displayName: form.displayName.trim(),
        priority: form.priority,
        badgeColor: form.badgeColor,
        textColor: form.textColor,
        permissions: form.permissions,
      }

      if (editingId === 'new') {
        const res = await fetch('/api/roles', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
        if (!res.ok) {
          const data = await res.json()
          throw new Error(data.errors?.[0]?.message || 'Failed to create role')
        }
        toast.success('Role created')
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

      setEditingId(null)
      setForm(emptyForm)
      mutateRoles()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (roleId: string) => {
    setDeleting(roleId)
    try {
      const res = await fetch(`/api/roles/${roleId}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to delete')
      toast.success('Role deleted')
      mutateRoles()
      if (assignRoleId === roleId) setAssignRoleId(null)
    } catch {
      toast.error('Failed to delete role')
    } finally {
      setDeleting(null)
    }
  }

  const assignUserToRole = async (userId: string) => {
    if (!assignRoleId) return
    try {
      // Get user's current assigned roles
      const userRes = await fetch(`/api/users/${userId}?depth=0`)
      const userData = await userRes.json()
      const currentRoles: string[] = (userData.assignedRoles || []).map((r: any) =>
        typeof r === 'string' ? r : r.id,
      )

      if (currentRoles.includes(assignRoleId)) {
        toast.error('User already has this role')
        return
      }

      // Also fix legacy roles (moderator/tester → player) so PATCH doesn't fail validation
      const patchBody: Record<string, unknown> = {
        assignedRoles: [...currentRoles, assignRoleId],
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
    }
  }

  const removeUserFromRole = async (userId: string) => {
    if (!assignRoleId) return
    try {
      const userRes = await fetch(`/api/users/${userId}?depth=0`)
      const userData = await userRes.json()
      const currentRoles: string[] = (userData.assignedRoles || []).map((r: any) =>
        typeof r === 'string' ? r : r.id,
      )

      const patchBody: Record<string, unknown> = {
        assignedRoles: currentRoles.filter((r) => r !== assignRoleId),
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
    }
  }

  // ── Editing / Creating form ──
  if (editingId) {
    const totalPerms = Object.values(form.permissions).reduce((sum, arr) => sum + arr.length, 0)

    return (
      <div className="space-y-6 max-w-2xl mx-auto">
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
              Priority: {form.priority} &middot; {totalPerms} permission{totalPerms !== 1 ? 's' : ''}
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
          <CardContent className="space-y-5">
            {(Object.entries(PERMISSION_GROUPS) as [PermCategory, typeof PERMISSION_GROUPS[PermCategory]][]).map(
              ([category, group]) => (
                <div key={category}>
                  <p className="text-sm font-medium mb-2">{group.label}</p>
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
              ),
            )}
          </CardContent>
        </Card>

        {/* Save */}
        <Button onClick={handleSave} disabled={saving} className="w-full" size="lg">
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
      <Card className="border-red-500/20">
        <CardContent className="p-4 flex items-center gap-3">
          <Shield className="h-5 w-5 text-red-500 shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-sm">Admin</span>
              <Badge style={{ backgroundColor: '#dc2626', color: '#ffffff' }}>Admin</Badge>
              <span className="text-xs text-muted-foreground">System role &middot; Full access</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Dynamic roles */}
      {roles.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            No custom roles created yet.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {roles.map((role: any) => {
            const permCount = [
              ...(role.permissions?.articles || []),
              ...(role.permissions?.support || []),
              ...(role.permissions?.forum || []),
              ...(role.permissions?.games || []),
              ...(role.permissions?.adminPages || []),
            ].length

            return (
              <Card key={role.id}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-sm">{role.displayName}</span>
                        <Badge style={{ backgroundColor: role.badgeColor, color: role.textColor }}>
                          {role.displayName}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          Priority: {role.priority} &middot; {permCount} perm{permCount !== 1 ? 's' : ''}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {role.name}
                        {role.permissions?.adminPages?.length > 0 && (
                          <> &middot; Admin pages: {role.permissions.adminPages.join(', ')}</>
                        )}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setAssignRoleId(assignRoleId === role.id ? null : role.id)}
                      >
                        <Users className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => startEdit(role)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(role.id)}
                        disabled={deleting === role.id}
                        className="text-destructive hover:text-destructive"
                      >
                        {deleting === role.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>

                  {/* User assignment panel */}
                  {assignRoleId === role.id && (
                    <div className="mt-4 pt-4 border-t space-y-3">
                      <p className="text-sm font-medium">Users with this role</p>

                      {/* Current users */}
                      {roleUsers.length > 0 ? (
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

                      {/* Search to add */}
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <DebouncedInput
                          onDebouncedChange={setUserSearchQuery}
                          placeholder="Search players to assign..."
                          className="pl-10"
                          debounce={300}
                        />
                      </div>

                      {userSearchQuery && searchResults.length > 0 && (
                        <div className="border rounded-lg divide-y max-h-48 overflow-y-auto">
                          {searchResults.map((player: any) => (
                            <button
                              key={player.id}
                              onClick={() => assignUserToRole(player.id)}
                              className="flex items-center gap-3 w-full px-3 py-2 text-left hover:bg-muted/50 transition-colors"
                            >
                              <TeeAvatarWithFallback
                                skinUrl={
                                  player.skin?.name ? getDDNetSkinUrl(player.skin.name) : undefined
                                }
                                size="xs"
                              />
                              <span className="text-sm font-medium">{player.name}</span>
                              <RoleBadge
                                role={(player as any).primaryRole || player.roles}
                                className="text-[10px] px-1.5 py-0"
                              />
                            </button>
                          ))}
                        </div>
                      )}

                      {userSearchQuery && searchResults.length === 0 && (
                        <p className="text-sm text-muted-foreground text-center py-2">
                          No players found
                        </p>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
