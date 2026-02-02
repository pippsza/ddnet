import type { CollectionConfig } from 'payload'
import { DDNET_CATEGORIES, GAME_STATUSES } from '@/lib/ddnet-constants'

export const Races: CollectionConfig = {
  slug: 'races',
  admin: {
    useAsTitle: 'title',
    group: 'Games',
    defaultColumns: ['title', 'status', 'currentRound', 'totalRounds', 'createdAt'],
    description: 'Race game sessions',
  },
  access: {
    read: () => true,
    create: ({ req }) => !!req.user,
    update: ({ req }) => {
      if (!req.user) return false
      if (req.user.roles === 'admin' || req.user.roles === 'moderator') return true
      // Allow creator to update their own game
      return {
        createdBy: { equals: req.user.id },
      }
    },
    delete: ({ req }) => {
      if (!req.user) return false
      return req.user.roles === 'admin'
    },
  },
  fields: [
    {
      name: 'title',
      type: 'text',
      required: true,
      label: 'Race Title',
    },
    {
      name: 'mode',
      type: 'select',
      required: true,
      options: [
        { label: 'Solo', value: 'solo' },
        { label: 'Multiplayer (2-4 players)', value: 'multiplayer' },
      ],
      defaultValue: 'multiplayer',
    },
    {
      name: 'isPublic',
      type: 'checkbox',
      defaultValue: false,
      label: 'Public Game',
      admin: {
        description: 'If enabled, this race will be visible in the public lobby',
      },
    },
    {
      name: 'inviteCode',
      type: 'text',
      unique: true,
      label: 'Invite Code',
      admin: {
        description: 'Code for joining private games',
        readOnly: true,
      },
    },
    {
      name: 'category',
      type: 'select',
      required: true,
      options: DDNET_CATEGORIES,
      label: 'Map Category',
    },
    {
      name: 'totalRounds',
      type: 'number',
      required: true,
      min: 1,
      max: 20,
      defaultValue: 5,
      label: 'Rounds to Win',
    },
    {
      name: 'currentRound',
      type: 'number',
      defaultValue: 0,
      admin: {
        readOnly: true,
      },
    },
    {
      name: 'currentMap',
      type: 'text',
      label: 'Current Map Being Played',
      admin: {
        readOnly: true,
      },
    },
    {
      name: 'server',
      type: 'group',
      label: 'Game Server',
      fields: [
        {
          name: 'ip',
          type: 'text',
          required: true,
          label: 'Server IP',
        },
        {
          name: 'port',
          type: 'number',
          required: true,
          defaultValue: 8303,
          label: 'Server Port',
        },
        {
          name: 'name',
          type: 'text',
          label: 'Server Name',
        },
      ],
    },
    {
      name: 'players',
      type: 'array',
      required: true,
      minRows: 1,
      maxRows: 4,
      label: 'Players',
      fields: [
        {
          name: 'user',
          type: 'relationship',
          relationTo: 'users',
          required: true,
        },
        {
          name: 'ingameNick',
          type: 'text',
          required: true,
          label: 'In-game Nickname',
        },
        {
          name: 'roundsWon',
          type: 'number',
          defaultValue: 0,
          admin: {
            readOnly: true,
          },
        },
        {
          name: 'isReady',
          type: 'checkbox',
          defaultValue: false,
        },
      ],
    },
    {
      name: 'rounds',
      type: 'array',
      label: 'Round History',
      admin: {
        readOnly: true,
      },
      fields: [
        {
          name: 'roundNumber',
          type: 'number',
          required: true,
        },
        {
          name: 'mapName',
          type: 'text',
          required: true,
        },
        {
          name: 'winner',
          type: 'relationship',
          relationTo: 'users',
        },
        {
          name: 'finishTime',
          type: 'number',
          label: 'Finish Time (seconds)',
        },
        {
          name: 'completedAt',
          type: 'date',
        },
      ],
    },
    {
      name: 'winner',
      type: 'relationship',
      relationTo: 'users',
      label: 'Race Winner',
      admin: {
        readOnly: true,
      },
    },
    {
      name: 'status',
      type: 'select',
      required: true,
      options: GAME_STATUSES,
      defaultValue: 'waiting',
    },
    {
      name: 'botId',
      type: 'text',
      label: 'Monitoring Bot Container ID',
      admin: {
        readOnly: true,
        description: 'ID of the bot monitoring this race',
      },
    },
    {
      name: 'createdBy',
      type: 'relationship',
      relationTo: 'users',
      required: true,
      admin: {
        readOnly: true,
      },
    },
    {
      name: 'startedAt',
      type: 'date',
      admin: {
        readOnly: true,
        date: {
          pickerAppearance: 'dayAndTime',
        },
      },
    },
    {
      name: 'completedAt',
      type: 'date',
      admin: {
        readOnly: true,
        date: {
          pickerAppearance: 'dayAndTime',
        },
      },
    },
  ],
}
