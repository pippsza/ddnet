import type { CollectionConfig } from 'payload'
import { hasPageAccess } from '@/lib/permissions'

export const FriendRequests: CollectionConfig = {
  slug: 'friend-requests',
  admin: {
    group: 'Social',
    defaultColumns: ['sender', 'recipient', 'status', 'createdAt'],
    description: 'Friend request management',
  },
  access: {
    read: async ({ req }) => {
      if (!req.user) return false
      if (!(await hasPageAccess(req, 'friends'))) return false
      if (req.user.roles === 'admin') return true
      // Users can only see requests they sent or received
      return {
        or: [
          { sender: { equals: req.user.id } },
          { recipient: { equals: req.user.id } },
        ],
      } as any
    },
    create: async ({ req }) => {
      if (!req.user) return false
      return hasPageAccess(req, 'friends')
    },
    update: ({ req }) => {
      if (!req.user) return false
      if (req.user.roles === 'admin') return true
      // Only recipient can update (accept/reject)
      return {
        recipient: { equals: req.user.id },
      }
    },
    delete: ({ req }) => {
      if (!req.user) return false
      if (req.user.roles === 'admin') return true
      // Both sender and recipient can delete (cancel/remove)
      return {
        or: [
          { sender: { equals: req.user.id } },
          { recipient: { equals: req.user.id } },
        ],
      } as any
    },
  },
  fields: [
    {
      name: 'sender',
      type: 'relationship',
      relationTo: 'users',
      required: true,
      label: 'Sender',
      admin: {
        description: 'User who sent the friend request',
      },
    },
    {
      name: 'recipient',
      type: 'relationship',
      relationTo: 'users',
      required: true,
      label: 'Recipient',
      admin: {
        description: 'User who received the friend request',
      },
    },
    {
      name: 'status',
      type: 'select',
      required: true,
      options: [
        { label: 'Pending', value: 'pending' },
        { label: 'Accepted', value: 'accepted' },
        { label: 'Rejected', value: 'rejected' },
      ],
      defaultValue: 'pending',
    },
    {
      name: 'message',
      type: 'text',
      label: 'Message',
      admin: {
        description: 'Optional message from sender',
      },
    },
  ],
  hooks: {
    beforeValidate: [
      async ({ data, req, operation }) => {
        if (operation === 'create' && data && req.user) {
          // Force sender to authenticated user (prevent spoofing)
          data.sender = req.user.id
          if (data.sender === data.recipient) {
            throw new Error('Cannot send friend request to yourself')
          }
        }
        return data
      },
    ],
  },
}
