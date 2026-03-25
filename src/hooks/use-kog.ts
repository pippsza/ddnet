import useSWR from 'swr'
import type { KoGPlayerData } from '@/lib/kog-types'

const kogFetcher = async (url: string): Promise<KoGPlayerData | null> => {
  const res = await fetch(url)
  if (!res.ok) return null
  return res.json()
}

export function useKoG(playerName: string | null | undefined) {
  const { data, error, isLoading } = useSWR<KoGPlayerData | null>(
    playerName
      ? `/api/players/${encodeURIComponent(playerName)}/kog`
      : null,
    kogFetcher,
    {
      dedupingInterval: 60_000,
      revalidateOnFocus: false,
      errorRetryCount: 2,
      keepPreviousData: true,
    },
  )

  return { kog: data ?? null, kogError: error, kogLoading: isLoading }
}
