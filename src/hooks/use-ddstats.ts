import useSWR from 'swr'
import type { DDStatsPlayerData } from '@/lib/ddstats-types'

const ddstatsFetcher = async (url: string): Promise<DDStatsPlayerData | null> => {
  const res = await fetch(url)
  if (!res.ok) return null
  return res.json()
}

export function useDDStats(playerName: string | null | undefined) {
  const { data, error, isLoading } = useSWR<DDStatsPlayerData | null>(
    playerName
      ? `/api/players/${encodeURIComponent(playerName)}/ddstats`
      : null,
    ddstatsFetcher,
    {
      dedupingInterval: 60_000,
      revalidateOnFocus: false,
      errorRetryCount: 2,
      keepPreviousData: true,
    },
  )

  return { ddstats: data ?? null, ddstatsError: error, ddstatsLoading: isLoading }
}
