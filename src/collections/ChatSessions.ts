import type { CollectionConfig } from 'payload'

export const ChatSessions: CollectionConfig = {
  slug: 'chat-sessions',
  admin: {
    group: 'Social',
    defaultColumns: ['initiator', 'targetNickname', 'status', 'createdAt'],
    description: 'In-game chat sessions between users via bot relay',
  },
  access: {
    read: ({ req }) => {
      if (!req.user) return false
      if (req.user.roles === 'admin') return true
      return {
        or: [
          { initiator: { equals: req.user.id } },
          { target: { equals: req.user.id } },
        ],
      } as any
    },
    create: ({ req }) => !!req.user,
    update: ({ req }) => {
      if (!req.user) return false
      if (req.user.roles === 'admin') return true
      return { initiator: { equals: req.user.id } }
    },
    delete: ({ req }) => {
      if (!req.user) return false
      if (req.user.roles === 'admin') return true
      return { initiator: { equals: req.user.id } }
    },
  },
  fields: [
    {
      name: 'initiator',
      type: 'relationship',
      relationTo: 'users',
      required: true,
    },
    {
      name: 'target',
      type: 'relationship',
      relationTo: 'users',
      required: true,
    },
    {
      name: 'targetNickname',
      type: 'text',
      required: true,
      label: 'Target In-game Nickname',
    },
    {
      name: 'status',
      type: 'select',
      options: [
        { label: 'Connecting', value: 'connecting' },
        { label: 'Active', value: 'active' },
        { label: 'Disconnected', value: 'disconnected' },
        { label: 'Error', value: 'error' },
      ],
      defaultValue: 'connecting',
    },
    {
      name: 'server',
      type: 'group',
      fields: [
        { name: 'ip', type: 'text' },
        { name: 'port', type: 'number' },
        { name: 'name', type: 'text' },
      ],
    },
    {
      name: 'botContainerId',
      type: 'text',
      admin: {
        readOnly: true,
      },
    },
    {
      name: 'startedAt',
      type: 'date',
    },
    {
      name: 'endedAt',
      type: 'date',
    },
  ],
}
