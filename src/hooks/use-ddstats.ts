import useSWR from 'swr'
import type { DDStatsPlayerData } from '@/lib/ddstats-types'

const ddstatsFetcher = async (url: string): Promise<DDStatsPlayerData> => {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`DDStats error: ${res.status}`)
  return res.json()
}

export function useDDStats(playerName: string | null | undefined) {
  const { data, error, isLoading } = useSWR<DDStatsPlayerData>(
    playerName
      ? `https://ddstats.tw/player/json?player=${encodeURIComponent(playerName)}`
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
