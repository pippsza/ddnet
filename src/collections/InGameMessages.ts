import type { CollectionConfig } from 'payload'
import { hasPageAccess } from '@/lib/permissions'

export const InGameMessages: CollectionConfig = {
  slug: 'in-game-messages',
  admin: {
    group: 'Social',
    defaultColumns: ['session', 'sender', 'content', 'createdAt'],
    description: 'Archived messages from in-game chat sessions',
  },
  access: {
    read: async ({ req }) => {
      if (!req.user) return false
      if (!(await hasPageAccess(req, 'ingame_chat'))) return false
      if (req.user.roles === 'admin') return true
      return true // Enforced at API level via session ownership
    },
    create: () => false,
    update: () => false,
    delete: ({ req }) => req.user?.roles === 'admin',
  },
  fields: [
    {
      name: 'session',
      type: 'relationship',
      relationTo: 'chat-sessions',
      required: true,
      index: true,
    },
    {
      name: 'sender',
      type: 'select',
      options: [
        { label: 'User', value: 'user' },
        { label: 'Friend', value: 'friend' },
        { label: 'System', value: 'system' },
      ],
      required: true,
    },
    {
      name: 'content',
      type: 'text',
      required: true,
    },
    {
      name: 'timestamp',
      type: 'date',
      required: true,
    },
  ],
  timestamps: true,
}
