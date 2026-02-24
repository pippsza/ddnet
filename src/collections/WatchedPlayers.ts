import type { CollectionConfig } from 'payload'

export const WatchedPlayers: CollectionConfig = {
  slug: 'watched-players',
  admin: {
    group: 'Social',
    defaultColumns: ['user', 'nickname', 'notifyOnline', 'lastKnownOnline', 'createdAt'],
    description: 'Player watchlist for online status tracking',
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
      if (req.user.roles === 'admin') return true
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
      label: 'Watcher',
      admin: {
        description: 'The user who is watching this player',
      },
    },
    {
      name: 'nickname',
      type: 'text',
      required: true,
      label: 'DDNet Nickname',
      admin: {
        description: 'The in-game nickname to watch (case-sensitive)',
      },
    },
    {
      name: 'notifyOnline',
      type: 'checkbox',
      defaultValue: true,
      label: 'Notify on Online',
      admin: {
        description: 'Send push notification when this player comes online',
      },
    },
    {
      name: 'lastKnownOnline',
      type: 'checkbox',
      defaultValue: false,
      label: 'Last Known Online',
      admin: {
        description: 'Used internally for offline→online transition detection',
        readOnly: true,
      },
    },
    {
      name: 'addedAt',
      type: 'date',
      required: true,
      defaultValue: () => new Date().toISOString(),
      admin: { readOnly: true },
    },
  ],
  hooks: {
    beforeValidate: [
      async ({ data, req, operation }) => {
        if (operation !== 'create' || !data || !req.user) return data

        data.user = req.user.id

        const { totalDocs } = await req.payload.find({
          collection: 'watched-players',
          where: { user: { equals: req.user.id } },
          limit: 0,
          req,
        })
        if (totalDocs >= 30) {
          throw new Error('Maximum of 30 watched players reached. Remove some to add new ones.')
        }

        return data
      },
    ],
  },
}
