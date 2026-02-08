import type { CollectionConfig } from 'payload'

export const PushSubscriptions: CollectionConfig = {
  slug: 'push-subscriptions',
  admin: {
    group: 'System',
    defaultColumns: ['user', 'createdAt'],
    description: 'PWA push notification subscriptions',
  },
  access: {
    read: ({ req }) => {
      if (!req.user) return false
      if (req.user.roles === 'admin') return true
      return { user: { equals: req.user.id } }
    },
    create: ({ req }) => !!req.user,
    update: ({ req }) => {
      if (!req.user) return false
      return { user: { equals: req.user.id } }
    },
    delete: ({ req }) => {
      if (!req.user) return false
      if (req.user.roles === 'admin') return true
      return { user: { equals: req.user.id } }
    },
  },
  fields: [
    {
      name: 'user',
      type: 'relationship',
      relationTo: 'users',
      required: true,
    },
    {
      name: 'endpoint',
      type: 'text',
      required: true,
    },
    {
      name: 'p256dh',
      type: 'text',
      required: true,
      label: 'P256DH Key',
    },
    {
      name: 'auth',
      type: 'text',
      required: true,
      label: 'Auth Key',
    },
  ],
}
