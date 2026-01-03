import type { CollectionConfig } from 'payload'
import {
  DDNET_CATEGORIES,
  DDNET_SUBCATEGORIES,
  BINGO_MODES,
  BINGO_GRID_SIZES,
  BINGO_WIN_CONDITIONS,
  BINGO_TEAM_COLORS,
  GAME_STATUSES,
  TEAM_STATUSES,
} from '@/lib/ddnet-constants'

/**
 * Bingo Game Collection
 * Represents individual bingo games with their configuration and results
 */
export const Bingo: CollectionConfig = {
  slug: 'bingo',
  admin: {
    useAsTitle: 'title',
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
      type: 'select',
      required: true,
      options: DDNET_CATEGORIES,
      label: 'Category',
    },
    {
      name: 'subcategory',
      type: 'select',
      label: 'Subcategory',
      options: DDNET_SUBCATEGORIES.map(({ label, value }) => ({ label, value })),
      admin: {
        condition: (data) => data.category === 'ddmax' || data.category === 'oldschool',
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
      minRows: 2,
      maxRows: 2,
      label: 'Teams',
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
            description: 'Solo mode: 1 player per team, Team mode: up to 2 players per team',
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
            description: 'Array of cell positions (0-48) that this team has completed',
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
        description: 'Index of winning team (0 or 1)',
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
