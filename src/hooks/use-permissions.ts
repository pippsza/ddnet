import useSWR from 'swr'
import type { ResolvedPermissions } from '@/lib/permissions'

const fetcher = (url: string) =>
  fetch(url, { credentials: 'include' }).then((r) => (r.ok ? r.json() : null))

export function usePermissions() {
  const { data, isLoading } = useSWR<ResolvedPermissions | null>(
    '/api/users/me/permissions',
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 30_000,
    },
  )

  return {
    permissions: data ?? null,
    isLoading,
    isAdmin: data?.isAdmin ?? false,
    hasPermission: (category: keyof Pick<ResolvedPermissions, 'articles' | 'support' | 'forum' | 'games' | 'adminPages'>, permission: string) => {
      if (!data) return false
      if (data.isAdmin) return true
      return data[category]?.includes(permission) ?? false
    },
    hasAdminPage: (page: string) => {
      if (!data) return false
      if (data.isAdmin) return true
      return data.adminPages.includes(page)
    },
    primaryRole: data?.primaryRole ?? null,
  }
}
