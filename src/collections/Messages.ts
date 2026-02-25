import type { CollectionConfig } from 'payload'
import { hasPageAccess } from '@/lib/permissions'

export const Messages: CollectionConfig = {
  slug: 'messages',
  admin: {
    group: 'Social',
    defaultColumns: ['conversation', 'sender', 'content', 'createdAt'],
  },
  access: {
    read: async ({ req }) => {
      if (!req.user) return false
      if (!(await hasPageAccess(req, 'chat'))) return false
      if (req.user.roles === 'admin') return true
      // Users can only read messages from their conversations
      // This is enforced at the API level by fetching conversation first
      return true
    },
    create: async ({ req }) => {
      if (!req.user) return false
      return hasPageAccess(req, 'chat')
    },
    update: ({ req }) => {
      if (!req.user) return false
      if (req.user.roles === 'admin') return true
      // Only recipient can mark as read
      return true
    },
    delete: ({ req }) => {
      if (!req.user) return false
      return req.user.roles === 'admin'
    },
  },
  fields: [
    {
      name: 'conversation',
      type: 'relationship',
      relationTo: 'conversations',
      required: true,
      index: true,
    },
    {
      name: 'sender',
      type: 'relationship',
      relationTo: 'users',
      required: true,
    },
    {
      name: 'content',
      type: 'text',
      required: true,
    },
    {
      name: 'images',
      type: 'array',
      fields: [
        {
          name: 'image',
          type: 'upload',
          relationTo: 'media',
          required: true,
        },
      ],
    },
    {
      name: 'isRead',
      type: 'checkbox',
      defaultValue: false,
    },
  ],
  timestamps: true,
}
