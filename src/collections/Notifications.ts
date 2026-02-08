import type { CollectionConfig } from 'payload'

export const Notifications: CollectionConfig = {
  slug: 'notifications',
  admin: {
    group: 'System',
    defaultColumns: ['title', 'type', 'recipient', 'isRead', 'createdAt'],
    description: 'In-app notifications for users',
  },
  access: {
    read: ({ req }) => {
      if (!req.user) return false
      if (req.user.roles === 'admin') return true
      // Users can only read their own notifications
      return {
        recipient: { equals: req.user.id },
      }
    },
    create: () => true, // System creates notifications
    update: ({ req }) => {
      if (!req.user) return false
      if (req.user.roles === 'admin') return true
      // Users can only update (mark as read) their own notifications
      return {
        recipient: { equals: req.user.id },
      }
    },
    delete: ({ req }) => {
      if (!req.user) return false
      if (req.user.roles === 'admin') return true
      // Users can delete their own notifications
      return {
        recipient: { equals: req.user.id },
      }
    },
  },
  fields: [
    {
      name: 'recipient',
      type: 'relationship',
      relationTo: 'users',
      required: true,
      label: 'Recipient',
      admin: {
        description: 'The user who will receive this notification',
      },
    },
    {
      name: 'type',
      type: 'select',
      required: true,
      options: [
        { label: 'Game Invite', value: 'game_invite' },
        { label: 'Friend Request', value: 'friend_request' },
        { label: 'Friend Accepted', value: 'friend_accepted' },
        { label: 'Game Started', value: 'game_started' },
        { label: 'Game Ended', value: 'game_ended' },
        { label: 'Round Won', value: 'round_won' },
        { label: 'Achievement', value: 'achievement' },
        { label: 'System', value: 'system' },
      ],
      admin: {
        description: 'Type of notification',
      },
    },
    {
      name: 'title',
      type: 'text',
      required: true,
      label: 'Title',
    },
    {
      name: 'message',
      type: 'textarea',
      required: true,
      label: 'Message',
    },
    {
      name: 'isRead',
      type: 'checkbox',
      defaultValue: false,
      label: 'Read',
    },
    {
      name: 'actionUrl',
      type: 'text',
      label: 'Action URL',
      admin: {
        description: 'URL to navigate to when clicking the notification',
      },
    },
    {
      name: 'relatedGame',
      type: 'relationship',
      relationTo: ['bingo', 'races'],
      label: 'Related Game',
      admin: {
        description: 'The game this notification is about (if any)',
      },
    },
    {
      name: 'relatedUser',
      type: 'relationship',
      relationTo: 'users',
      label: 'From User',
      admin: {
        description: 'The user who triggered this notification (if any)',
      },
    },
    {
      name: 'metadata',
      type: 'json',
      label: 'Additional Data',
      admin: {
        description: 'Extra data for custom notification handling',
      },
    },
  ],
  hooks: {
    beforeChange: [
      ({ data, operation }) => {
        // Auto-set read status for new notifications
        if (operation === 'create' && data) {
          data.isRead = false
        }
        return data
      },
    ],
    afterChange: [
      async ({ doc, operation }) => {
        // Send push notification on creation
        if (operation === 'create' && doc.recipient) {
          try {
            const { sendPushToUser } = await import('@/lib/push-notifications')
            const recipientId = typeof doc.recipient === 'string' ? doc.recipient : doc.recipient.id
            await sendPushToUser(recipientId, {
              title: doc.title,
              body: doc.message,
              url: doc.actionUrl || '/app',
            })
          } catch {
            // Push notification is optional, don't fail the operation
          }
        }
      },
    ],
  },
}
