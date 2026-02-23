'use client'

import { useSearchParams, useRouter, usePathname } from 'next/navigation'
import { useCallback, useMemo } from 'react'

interface UsePaginationOptions {
  /** Default items per page (default: 20) */
  defaultLimit?: number
  /** URL param name for page (default: 'page'). Use unique names for multiple sections. */
  pageParam?: string
}

interface PageInfo {
  totalDocs: number
  totalPages: number
  hasNextPage: boolean
  hasPrevPage: boolean
  from: number
  to: number
}

export function usePagination(options: UsePaginationOptions = {}) {
  const { defaultLimit = 20, pageParam = 'page' } = options

  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()

  const page = useMemo(() => {
    const raw = searchParams.get(pageParam)
    if (!raw) return 1
    const parsed = parseInt(raw, 10)
    return Number.isNaN(parsed) || parsed < 1 ? 1 : parsed
  }, [searchParams, pageParam])

  const limit = defaultLimit

  const setPage = useCallback(
    (newPage: number) => {
      const clamped = Math.max(1, newPage)
      const params = new URLSearchParams(searchParams.toString())
      if (clamped <= 1) {
        params.delete(pageParam)
      } else {
        params.set(pageParam, String(clamped))
      }
      const qs = params.toString()
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
    },
    [searchParams, router, pathname, pageParam],
  )

  const resetPage = useCallback(() => {
    const params = new URLSearchParams(searchParams.toString())
    params.delete(pageParam)
    const qs = params.toString()
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
  }, [searchParams, router, pathname, pageParam])

  const buildUrl = useCallback(
    (baseUrl: string): string => {
      const separator = baseUrl.includes('?') ? '&' : '?'
      return `${baseUrl}${separator}page=${page}&limit=${limit}`
    },
    [page, limit],
  )

  const getPageInfo = useCallback(
    (response: { totalDocs?: number; totalPages?: number }): PageInfo => {
      const totalDocs = response.totalDocs ?? 0
      const totalPages = response.totalPages ?? 1
      const from = totalDocs === 0 ? 0 : (page - 1) * limit + 1
      const to = Math.min(page * limit, totalDocs)
      return {
        totalDocs,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
        from,
        to,
      }
    },
    [page, limit],
  )

  return { page, limit, setPage, resetPage, buildUrl, getPageInfo }
}
