'use client'

import { useState, useMemo, useCallback } from 'react'
import useSWR from 'swr'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { DebouncedInput } from '@/components/ui/debounced-input'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { toast } from 'sonner'
import { Save, Loader2, X, Search, Trash2, ShieldAlert, Plus } from 'lucide-react'

const fetcher = (url: string) => fetch(url).then((r) => r.json())

interface FormData {
  ingameNick: string
  roles: string
  isSystemVerified: boolean
}

function formFromUser(user: any): FormData {
  return {
    ingameNick: user.ingameNick || '',
    roles: user.roles || 'player',
    isSystemVerified: !!user.isSystemVerified,
  }
}

export function PlayerSettingsTab({ user, mutate }: { user: any; mutate: () => void }) {
  const router = useRouter()
  const [form, setForm] = useState<FormData>(() => formFromUser(user))
  const [originalForm, setOriginalForm] = useState<FormData>(() => formFromUser(user))
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)

  // Role assignment
  const [roleSearchQuery, setRoleSearchQuery] = useState('')
  const { data: roleSearchData, isLoading: isSearchingRoles } = useSWR(
    roleSearchQuery
      ? `/api/roles?where[displayName][contains]=${encodeURIComponent(roleSearchQuery)}&limit=10&depth=0`
      : null,
    fetcher,
  )
  const roleSearchResults: any[] = roleSearchData?.docs || []

  // Current assigned roles (populated from user object)
  const assignedRoles: any[] = useMemo(
    () =>
      (user.assignedRoles || [])
        .map((r: any) => (typeof r === 'object' && r !== null ? r : null))
        .filter(Boolean),
    [user.assignedRoles],
  )
  const assignedRoleIds = useMemo(
    () => new Set(assignedRoles.map((r: any) => r.id)),
    [assignedRoles],
  )

  // Filter already-assigned from search results
  const filteredRoleResults = useMemo(
    () => roleSearchResults.filter((r: any) => !assignedRoleIds.has(r.id)),
    [roleSearchResults, assignedRoleIds],
  )

  const isDirty = useMemo(
    () => JSON.stringify(form) !== JSON.stringify(originalForm),
    [form, originalForm],
  )

  const handleSave = async () => {
    if (!form.ingameNick.trim()) {
      toast.error('In-game nickname is required')
      return
    }
    setSaving(true)
    try {
      const res = await fetch(`/api/users/${user.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ingameNick: form.ingameNick.trim(),
          roles: form.roles,
          isSystemVerified: form.isSystemVerified,
        }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.errors?.[0]?.message || 'Failed to save')
      }
      toast.success('Player updated')
      setOriginalForm(form)
      mutate()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  const assignRole = useCallback(
    async (roleId: string) => {
      const currentIds = (user.assignedRoles || []).map((r: any) =>
        typeof r === 'string' ? r : r.id,
      )
      if (currentIds.includes(roleId)) {
        toast.error('Role already assigned')
        return
      }
      try {
        const res = await fetch(`/api/users/${user.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ assignedRoles: [...currentIds, roleId] }),
        })
        if (!res.ok) throw new Error('Failed to assign role')
        toast.success('Role assigned')
        setRoleSearchQuery('')
        mutate()
      } catch (err: unknown) {
        toast.error(err instanceof Error ? err.message : 'Failed to assign')
      }
    },
    [user.id, user.assignedRoles, mutate],
  )

  const removeRole = useCallback(
    async (roleId: string) => {
      const currentIds = (user.assignedRoles || []).map((r: any) =>
        typeof r === 'string' ? r : r.id,
      )
      try {
        const res = await fetch(`/api/users/${user.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ assignedRoles: currentIds.filter((id: string) => id !== roleId) }),
        })
        if (!res.ok) throw new Error('Failed to remove role')
        toast.success('Role removed')
        mutate()
      } catch (err: unknown) {
        toast.error(err instanceof Error ? err.message : 'Failed to remove')
      }
    },
    [user.id, user.assignedRoles, mutate],
  )

  const handleDelete = async () => {
    setDeleting(true)
    try {
      const res = await fetch(`/api/users/${user.id}`, { method: 'DELETE' })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.errors?.[0]?.message || 'Failed to delete')
      }
      toast.success('Player deleted')
      router.push('/app/players')
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete')
      setDeleting(false)
    }
  }

  return (
    <div className="flex flex-col gap-6 w-full">
      {/* Identity & Profile */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Identity & Profile</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Username (login)</Label>
              <Input value={user.username || ''} disabled className="opacity-60" />
              <p className="text-xs text-muted-foreground mt-1">Cannot be changed</p>
            </div>
            <div>
              <Label>In-Game Nickname</Label>
              <Input
                value={form.ingameNick}
                onChange={(e) => setForm((f) => ({ ...f, ingameNick: e.target.value }))}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>System Role</Label>
              <Select
                value={form.roles}
                onValueChange={(v) => setForm((f) => ({ ...f, roles: v }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="player">Player</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Last Seen</Label>
              <Input
                value={user.lastSeenAt ? new Date(user.lastSeenAt).toLocaleString() : 'Never'}
                disabled
                className="opacity-60"
              />
            </div>
          </div>

          <div className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <p className="text-sm font-medium">System Verified</p>
              <p className="text-xs text-muted-foreground">
                Player has verified their identity via /verify bot
              </p>
            </div>
            <Switch
              checked={form.isSystemVerified}
              onCheckedChange={(v) => setForm((f) => ({ ...f, isSystemVerified: v }))}
            />
          </div>

          <Button onClick={handleSave} disabled={saving || !isDirty} className="w-full">
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save Changes
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Role Assignment */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Assigned Roles</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {assignedRoles.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {assignedRoles.map((role: any) => (
                <Badge
                  key={role.id}
                  variant="secondary"
                  className="flex items-center gap-1.5 pr-1"
                  style={{ backgroundColor: `${role.badgeColor}20`, color: role.badgeColor }}
                >
                  <span>{role.displayName}</span>
                  <button
                    onClick={() => removeRole(role.id)}
                    className="ml-0.5 rounded-full p-0.5 hover:bg-muted"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">No roles assigned</p>
          )}

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <DebouncedInput
              onDebouncedChange={setRoleSearchQuery}
              placeholder="Search roles to assign..."
              className="pl-10"
              debounce={300}
            />
          </div>

          {roleSearchQuery && isSearchingRoles && (
            <div className="border rounded-lg divide-y">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 px-3 py-2">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-5 w-16 rounded-full ml-auto" />
                </div>
              ))}
            </div>
          )}

          {roleSearchQuery && !isSearchingRoles && filteredRoleResults.length > 0 && (
            <div className="border rounded-lg divide-y max-h-48 overflow-y-auto">
              {filteredRoleResults.map((role: any) => (
                <button
                  key={role.id}
                  onClick={() => assignRole(role.id)}
                  className="flex items-center gap-3 w-full px-3 py-2 text-left hover:bg-muted/50 transition-colors"
                >
                  <span className="text-sm font-medium flex-1">{role.displayName}</span>
                  <RoleBadge
                    role={{
                      name: role.name,
                      displayName: role.displayName,
                      badgeColor: role.badgeColor,
                      textColor: role.textColor,
                    }}
                    className="text-[10px] px-1.5 py-0"
                  />
                  <Plus className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                </button>
              ))}
            </div>
          )}

          {roleSearchQuery && !isSearchingRoles && filteredRoleResults.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-2">No roles found</p>
          )}
        </CardContent>
      </Card>

      {/* Danger Zone */}
      <Card className="border-destructive/30">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2 text-destructive">
            <ShieldAlert className="h-4 w-4" />
            Danger Zone
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Delete Account</p>
              <p className="text-xs text-muted-foreground">
                Permanently remove this player and all associated data
              </p>
            </div>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="sm" disabled={deleting}>
                  {deleting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <Trash2 className="h-4 w-4 mr-1" />
                      Delete
                    </>
                  )}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete &ldquo;{user.ingameNick}&rdquo;?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently delete this player account, their game statistics, friend
                    connections, and all associated data. This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDelete}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Delete Account
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
