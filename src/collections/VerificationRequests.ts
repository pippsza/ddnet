import type { CollectionConfig } from 'payload'
import { VERIFICATION_STATUSES, VERIFICATION_TTL_MS } from '@/lib/verification-constants'

export const VerificationRequests: CollectionConfig = {
  slug: 'verification-requests',
  admin: {
    useAsTitle: 'nickname',
    group: 'Verification',
    defaultColumns: ['nickname', 'status', 'message', 'currentServer', 'expiresAt', 'createdAt'],
  },
  access: {
    read: ({ req }) => {
      if (!req.user) return false
      if (req.user.roles === 'admin') return true
      return { user: { equals: req.user.id } }
    },
    create: () => true, // Claim mode doesn't require auth
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
      name: 'mode',
      type: 'select',
      required: true,
      options: [
        { label: 'Verify', value: 'verify' },
        { label: 'Claim', value: 'claim' },
      ],
      defaultValue: 'verify',
      label: 'Mode',
      admin: {
        description: 'verify = normal verification, claim = force steal nickname',
      },
    },
    {
      name: 'status',
      type: 'select',
      required: true,
      options: VERIFICATION_STATUSES.map((s) => s),
      defaultValue: 'pending',
      label: 'Status',
    },
    {
      name: 'message',
      type: 'text',
      label: 'Message',
      admin: {
        description: 'Reason for failure (not_logged_in, not_found, error details)',
      },
    },
    {
      name: 'currentServer',
      type: 'text',
      label: 'Current Server',
      admin: {
        description: 'IP:Port where the bot checked the player',
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
      label: 'User',
      admin: {
        description: 'Linked user (empty for claim mode — user does not exist yet)',
      },
    },
    {
      name: 'claimNick',
      type: 'text',
      label: 'Claim Nickname',
      admin: {
        description: 'The nickname being claimed (only for claim mode)',
      },
    },
    {
      name: 'consumed',
      type: 'checkbox',
      defaultValue: false,
      label: 'Consumed',
      admin: {
        description: 'Whether this claim has been used to create a verified account',
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
        date: {
          pickerAppearance: 'dayAndTime',
        },
      },
    },
  ],
}
