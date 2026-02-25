import type { CollectionConfig } from 'payload'
import { hasPageAccess } from '@/lib/permissions'

export const Conversations: CollectionConfig = {
  slug: 'conversations',
  admin: {
    group: 'Social',
    defaultColumns: ['participants', 'lastMessage', 'lastMessageAt'],
  },
  access: {
    read: async ({ req }) => {
      if (!req.user) return false
      if (!(await hasPageAccess(req, 'chat'))) return false
      if (req.user.roles === 'admin') return true
      return {
        'participants.user': { equals: req.user.id },
      }
    },
    create: async ({ req }) => {
      if (!req.user) return false
      return hasPageAccess(req, 'chat')
    },
    update: ({ req }) => {
      if (!req.user) return false
      if (req.user.roles === 'admin') return true
      return {
        'participants.user': { equals: req.user.id },
      }
    },
    delete: ({ req }) => {
      if (!req.user) return false
      return req.user.roles === 'admin'
    },
  },
  fields: [
    {
      name: 'participants',
      type: 'array',
      required: true,
      minRows: 2,
      maxRows: 2,
      fields: [
        {
          name: 'user',
          type: 'relationship',
          relationTo: 'users',
          required: true,
        },
      ],
    },
    {
      name: 'lastMessage',
      type: 'text',
      label: 'Last Message Preview',
    },
    {
      name: 'lastMessageAt',
      type: 'date',
      label: 'Last Message Time',
      index: true,
    },
    {
      name: 'lastMessageBy',
      type: 'relationship',
      relationTo: 'users',
    },
  ],
  timestamps: true,
}
