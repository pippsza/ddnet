import type { CollectionConfig } from 'payload'
import {
  DDNET_SUBCATEGORIES,
  BINGO_MODES,
  BINGO_GRID_SIZES,
  BINGO_WIN_CONDITIONS,
  BINGO_TEAM_COLORS,
  GAME_STATUSES,
  TEAM_STATUSES,
} from '@/lib/ddnet-constants'
import { validateCategory, isCustomCategory } from '@/lib/category-helpers'

/**
 * Generate random invite code for private games
 */
function generateInviteCode(): string {
  const characters = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // Exclude similar: I,1,O,0
  const length = 8
  let code = ''
  for (let i = 0; i < length; i++) {
    code += characters.charAt(Math.floor(Math.random() * characters.length))
  }
  return code
}

/**
 * Bingo Game Collection
 * Represents individual bingo games with their configuration and results
 */
export const Bingo: CollectionConfig = {
  slug: 'bingo',
  admin: {
    useAsTitle: 'title',
    group: 'Games',
    defaultColumns: ['title', 'mode', 'category', 'status', 'createdAt'],
  },
  access: {
    read: () => true,
    update: ({ req }) => {
      if (!req.user) return false
      return req.user.roles === 'admin' || req.user.roles === 'moderator'
    },
    create: ({ req }) => {
      return !!req.user
    },
    delete: ({ req }) => {
      if (!req.user) return false
      return req.user.roles === 'admin' || req.user.roles === 'moderator'
    },
  },
  fields: [
    {
      name: 'title',
      type: 'text',
      required: true,
      label: 'Game Title',
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
      name: 'category',
      type: 'text',
      required: true,
      label: 'Category',
      validate: validateCategory,
    },
    {
      name: 'subcategory',
      type: 'select',
      label: 'Subcategory',
      options: DDNET_SUBCATEGORIES.map(({ label, value }) => ({ label, value })),
      admin: {
        condition: (data) =>
          !isCustomCategory(data.category || '') &&
          (data.category === 'ddmax' || data.category === 'oldschool'),
        description: 'Available for DDmaX and Oldschool categories',
      },
    },
    {
      name: 'gridSize',
      type: 'select',
      required: true,
      options: BINGO_GRID_SIZES,
      defaultValue: '5x5',
      label: 'Grid Size',
    },
    {
      name: 'winCondition',
      type: 'select',
      required: true,
      options: BINGO_WIN_CONDITIONS,
      defaultValue: 'line',
      label: 'Win Condition',
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
        description: 'Auto-generated code for private games. Share this link: /bingo/join/{code}',
        readOnly: true,
      },
      hooks: {
        beforeChange: [
          ({ value, operation, data }) => {
            // Generate invite code for private games
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
      required: true,
      minRows: 9,
      maxRows: 49,
      label: 'Maps in Game',
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
          label: 'Position on Grid (0-48)',
          min: 0,
          max: 48,
        },
      ],
    },
    {
      name: 'teams',
      type: 'array',
      required: true,
      label: 'Teams',
      admin: {
        description: 'Solo mode: 1 team (1-2 players), Team mode: 2 teams (1-2 players each)',
      },
      validate: (value, { data }) => {
        if (!value || !Array.isArray(value)) {
          return 'Teams array is required'
        }

        // Solo mode: must have exactly 1 team
        if ((data as any)?.mode === 'solo' && value.length !== 1) {
          return 'Solo mode must have exactly 1 team'
        }

        // Team mode: must have exactly 2 teams
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
          required: true,
          minRows: 1,
          maxRows: 2,
          label: 'Players',
          admin: {
            description: 'Each team must have 1-2 players. Only players in team receive tokens.',
          },
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
          name: 'completedCells',
          type: 'array',
          label: 'Completed Cells',
          admin: {
            description: 'Array of cell positions that this team has completed',
          },
          fields: [
            {
              name: 'cellPosition',
              type: 'number',
              required: true,
              min: 0,
              max: 48,
              label: 'Cell Position',
            },
            {
              name: 'completedAt',
              type: 'date',
              label: 'Completed At',
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
        condition: (data) => data.mode === 'team',
        description: 'Index of winning team (0 or 1) - only for team mode with 2 teams',
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
      label: 'Duration (minutes)',
      admin: {
        description: 'Calculated automatically',
      },
    },
  ],
}
