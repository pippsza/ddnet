import type { CollectionConfig } from 'payload'
import { VERIFICATION_STATUSES, VERIFICATION_TTL_MS } from '@/lib/verification-constants'

export const VerificationRequests: CollectionConfig = {
  slug: 'verification-requests',
  admin: {
    useAsTitle: 'nickname',
    group: 'Verification',
    defaultColumns: ['nickname', 'status', 'currentServer', 'expiresAt', 'createdAt'],
  },
  access: {
    read: ({ req }) => {
      if (!req.user) return false
      if (req.user.roles === 'admin') return true
      return { user: { equals: req.user.id } }
    },
    create: ({ req }) => !!req.user,
    update: ({ req }) => req.user?.roles === 'admin',
    delete: ({ req }) => req.user?.roles === 'admin',
  },
  hooks: {
    beforeChange: [
      ({ data, operation }) => {
        if (operation === 'create') {
          data.expiresAt = new Date(Date.now() + VERIFICATION_TTL_MS).toISOString()
        }
        return data
      },
    ],
  },
  fields: [
    {
      name: 'nickname',
      type: 'text',
      required: true,
      index: true,
      label: 'Nickname',
      admin: {
        description: 'The in-game nickname to verify',
      },
    },
    {
      name: 'token',
      type: 'text',
      required: true,
      label: 'Verification Token',
      admin: {
        readOnly: true,
        description: '6-digit verification code',
      },
    },
    {
      name: 'status',
      type: 'select',
      required: true,
      options: VERIFICATION_STATUSES.map((s) => s),
      defaultValue: 'pending',
      label: 'Status',
      admin: {
        description: 'Current verification status',
      },
    },
    {
      name: 'currentServer',
      type: 'text',
      label: 'Current Server',
      admin: {
        description: 'IP:Port where the bot found the player',
      },
    },
    {
      name: 'containerId',
      type: 'text',
      label: 'Container ID',
      admin: {
        description: 'Docker container ID running the bot',
      },
    },
    {
      name: 'user',
      type: 'relationship',
      relationTo: 'users',
      required: true,
      label: 'User',
      admin: {
        description: 'User who initiated the verification',
      },
    },
    {
      name: 'expiresAt',
      type: 'date',
      required: true,
      index: true,
      label: 'Expires At',
      admin: {
        readOnly: true,
        description: 'When this verification request expires',
        date: {
          pickerAppearance: 'dayAndTime',
        },
      },
    },
  ],
}
