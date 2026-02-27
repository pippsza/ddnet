import type { GlobalConfig } from 'payload'

export const BotSettings: GlobalConfig = {
  slug: 'bot-settings',
  admin: {
    group: 'Bots',
  },
  access: {
    read: () => true,
    update: ({ req }) => req.user?.roles === 'admin',
  },
  fields: [
    {
      name: 'verificationBotEnabled',
      type: 'checkbox',
      defaultValue: true,
      label: 'Verification Bot Enabled',
      admin: {
        description:
          'When disabled, verification and claim flows will show a "temporarily disabled" message.',
      },
    },
    {
      name: 'raceBotEnabled',
      type: 'checkbox',
      defaultValue: true,
      label: 'Race Bot Enabled',
      admin: {
        description:
          'When disabled, races still work (server-side scoring), but the in-game announcement bot will not start.',
      },
    },
    {
      name: 'ingameChatBotEnabled',
      type: 'checkbox',
      defaultValue: true,
      label: 'In-Game Chat Bot Enabled',
      admin: {
        description:
          'When disabled, the "Chat In-Game" button is hidden and the ingame-chat page shows a disabled message.',
      },
    },
  ],
}
