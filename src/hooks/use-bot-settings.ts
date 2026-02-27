import useSWR from 'swr'

export interface BotSettingsData {
  verificationBotEnabled: boolean
  raceBotEnabled: boolean
  ingameChatBotEnabled: boolean
}

const fetcher = (url: string) => fetch(url).then((r) => r.json())

export function useBotSettings() {
  const { data, isLoading } = useSWR<BotSettingsData>('/api/bot-settings', fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 30_000,
    fallbackData: {
      verificationBotEnabled: true,
      raceBotEnabled: true,
      ingameChatBotEnabled: true,
    },
  })

  return {
    botSettings: data!,
    isLoading,
  }
}
