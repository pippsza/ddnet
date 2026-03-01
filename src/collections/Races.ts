import type { CollectionConfig } from 'payload'
import { hasPermission, hasPageAccess } from '@/lib/permissions'
import {
  BINGO_MODES,
  BINGO_TEAM_COLORS,
  GAME_STATUSES,
  TEAM_STATUSES,
} from '@/lib/ddnet-constants'
import { validateCategory } from '@/lib/category-helpers'

function generateInviteCode(): string {
  const characters = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  const length = 8
  let code = ''
  for (let i = 0; i < length; i++) {
    code += characters.charAt(Math.floor(Math.random() * characters.length))
  }
  return code
}

export const Races: CollectionConfig = {
  slug: 'races',
  admin: {
    useAsTitle: 'title',
    group: 'Games',
    defaultColumns: ['title', 'mode', 'category', 'gameStatus', 'createdAt'],
    description: 'Race game sessions',
  },
  hooks: {
    beforeChange: [
      ({ data, originalDoc, operation }) => {
        if (operation !== 'update' || !data) return data
        // Validate server IP only when transitioning to in_progress
        if (data.gameStatus === 'in_progress' && originalDoc?.gameStatus !== 'in_progress') {
          if (!data.server?.ip && !originalDoc?.server?.ip) {
            throw new Error('Server IP is required to start the game')
          }
        }
        return data
      },
    ],
  },
  access: {
    read: async ({ req }) => {
      if (req.user && !(await hasPageAccess(req, 'race'))) return false
      return true
    },
    create: async ({ req }) => {
      if (!req.user) return false
      return hasPageAccess(req, 'race')
    },
    update: async ({ req }) => {
      if (!req.user) return false
      if (!(await hasPageAccess(req, 'race'))) return false
      return hasPermission(req, 'games', 'edit_any')
    },
    delete: async ({ req }) => {
      if (!req.user) return false
      if (!(await hasPageAccess(req, 'race'))) return false
      return hasPermission(req, 'games', 'delete_any')
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
      options: BINGO_MODES,
      defaultValue: 'solo',
      label: 'Game Mode',
    },
    {
      name: 'categoryMode',
      type: 'select',
      required: true,
      options: [
        { label: 'Selected (pre-determined maps)', value: 'selected' },
        { label: 'Free (any map, filled dynamically)', value: 'free' },
      ],
      defaultValue: 'selected',
      label: 'Category Mode',
    },
    {
      name: 'category',
      type: 'text',
      required: true,
      label: 'Map Category',
      validate: validateCategory,
    },
    {
      name: 'pathLength',
      type: 'number',
      required: true,
      min: 3,
      max: 20,
      defaultValue: 5,
      label: 'Path Length',
      admin: {
        description: 'Number of steps in the race path (3-20)',
      },
    },
    {
      name: 'isPublic',
      type: 'checkbox',
      defaultValue: false,
      label: 'Public Game',
      admin: {
        description: 'Public games are visible in lobby, private games require invite code',
      },
    },
    {
      name: 'difficultyRange',
      type: 'group',
      label: 'Map Difficulty Range (stars)',
      fields: [
        {
          name: 'min',
          type: 'number',
          min: 0,
          max: 5,
          defaultValue: 0,
          label: 'Minimum Difficulty',
        },
        {
          name: 'max',
          type: 'number',
          min: 0,
          max: 5,
          defaultValue: 5,
          label: 'Maximum Difficulty',
        },
      ],
    },
    {
      name: 'server',
      type: 'group',
      label: 'Game Server',
      fields: [
        {
          name: 'ip',
          type: 'text',
          label: 'Server IP',
        },
        {
          name: 'port',
          type: 'number',
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
      name: 'createdBy',
      type: 'relationship',
      relationTo: 'users',
      required: true,
      label: 'Game Creator',
      admin: {
        readOnly: true,
      },
      hooks: {
        beforeChange: [
          ({ req, operation, value }) => {
            if (operation === 'create' && req.user) {
              return req.user.id
            }
            return value
          },
        ],
      },
    },
    {
      name: 'inviteCode',
      type: 'text',
      unique: true,
      label: 'Invite Code',
      admin: {
        description: 'Auto-generated code for private games',
        readOnly: true,
      },
      hooks: {
        beforeChange: [
          ({ value, operation, data }) => {
            if (operation === 'create' && data && !data.isPublic && !value) {
              return generateInviteCode()
            }
            return value
          },
        ],
      },
    },
    {
      name: 'maps',
      type: 'array',
      label: 'Maps in Race Path',
      admin: {
        description: 'For selected mode: pre-filled on start. For free mode: filled as maps are completed.',
      },
      fields: [
        {
          name: 'mapName',
          type: 'text',
          required: true,
          label: 'Map Name',
        },
        {
          name: 'position',
          type: 'number',
          required: true,
          label: 'Position on Path (0-based)',
          min: 0,
          max: 19,
        },
        {
          name: 'points',
          type: 'number',
          label: 'Points',
          defaultValue: 0,
        },
        {
          name: 'difficulty',
          type: 'number',
          label: 'Difficulty (stars)',
          defaultValue: 0,
          min: 0,
          max: 5,
        },
      ],
    },
    {
      name: 'teams',
      type: 'array',
      required: true,
      label: 'Teams',
      admin: {
        description: 'Solo mode: 1 team, Team mode: 2 teams (1-2 players each)',
      },
      validate: (value, { data }) => {
        if (!value || !Array.isArray(value)) {
          return 'Teams array is required'
        }
        if ((data as any)?.mode === 'solo' && value.length !== 1) {
          return 'Solo mode must have exactly 1 team'
        }
        if ((data as any)?.mode === 'team' && value.length !== 2) {
          return 'Team mode must have exactly 2 teams'
        }
        return true
      },
      fields: [
        {
          name: 'teamName',
          type: 'text',
          required: true,
          label: 'Team Name',
          defaultValue: 'Team',
        },
        {
          name: 'color',
          type: 'select',
          required: true,
          options: BINGO_TEAM_COLORS,
          label: 'Team Color',
        },
        {
          name: 'players',
          type: 'array',
          maxRows: 2,
          label: 'Players',
          fields: [
            {
              name: 'user',
              type: 'relationship',
              relationTo: 'users',
              required: true,
              label: 'Player',
            },
            {
              name: 'isReady',
              type: 'checkbox',
              defaultValue: false,
              label: 'Ready Status',
            },
          ],
        },
        {
          name: 'pendingInvites',
          type: 'array',
          label: 'Pending Invites',
          fields: [
            {
              name: 'user',
              type: 'relationship',
              relationTo: 'users',
              required: true,
              label: 'Invited Player',
            },
            {
              name: 'invitedAt',
              type: 'date',
              label: 'Invited At',
            },
          ],
        },
        {
          name: 'score',
          type: 'number',
          defaultValue: 0,
          label: 'Points Earned',
          admin: {
            description: 'Number of steps claimed by this team',
          },
        },
        {
          name: 'completedSteps',
          type: 'array',
          label: 'Completed Steps',
          admin: {
            description: 'Steps on the path completed by this team',
          },
          fields: [
            {
              name: 'position',
              type: 'number',
              required: true,
              min: 0,
              max: 19,
              label: 'Step Position',
            },
            {
              name: 'completedAt',
              type: 'date',
              label: 'Completed At',
            },
            {
              name: 'finishTime',
              type: 'number',
              label: 'Finish Time (seconds)',
            },
          ],
        },
        {
          name: 'teamStatus',
          type: 'select',
          required: true,
          options: TEAM_STATUSES,
          defaultValue: 'not_ready',
          label: 'Team Status',
        },
      ],
    },
    {
      name: 'currentStep',
      type: 'number',
      defaultValue: 0,
      label: 'Current Step',
      admin: {
        description: 'Which step is currently being played (0-indexed)',
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
      name: 'gameStatus',
      type: 'select',
      required: true,
      options: GAME_STATUSES,
      defaultValue: 'waiting',
      label: 'Game Status',
    },
    {
      name: 'winnerTeam',
      type: 'number',
      label: 'Winner Team Index',
      admin: {
        description: 'Index of winning team (0 or 1)',
      },
      min: 0,
      max: 1,
    },
    {
      name: 'surrenderedByTeam',
      type: 'number',
      label: 'Surrendered By Team Index',
      admin: {
        description: 'Index of the team that surrendered (0 or 1)',
      },
      min: 0,
      max: 1,
    },
    {
      name: 'startedAt',
      type: 'date',
      label: 'Started At',
    },
    {
      name: 'completedAt',
      type: 'date',
      label: 'Completed At',
    },
    {
      name: 'duration',
      type: 'number',
      label: 'Duration (seconds)',
      admin: {
        description: 'Calculated automatically',
      },
    },
    {
      name: 'botContainerId',
      type: 'text',
      label: 'Bot Container ID',
      admin: {
        readOnly: true,
        description: 'Docker container ID of the monitoring bot',
      },
    },
    {
      name: 'rematchGame',
      type: 'relationship',
      relationTo: 'races',
      label: 'Rematch Game',
      admin: {
        description: 'Reference to the rematch game created from this one',
      },
    },
  ],
}
