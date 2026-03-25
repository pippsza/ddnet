import type { CollectionConfig } from 'payload'
import { hasPermission, hasPageAccess } from '@/lib/permissions'
import {
  BINGO_MODES,
  BINGO_GRID_SIZES,
  BINGO_WIN_CONDITIONS,
  BINGO_TEAM_COLORS,
  GAME_STATUSES,
  TEAM_STATUSES,
} from '@/lib/ddnet-constants'
import { KOG_CATEGORIES } from '@/lib/kog-constants'
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

export const KogBingo: CollectionConfig = {
  slug: 'kog-bingo',
  admin: {
    useAsTitle: 'title',
    group: 'KoG Games',
    defaultColumns: ['title', 'mode', 'category', 'gameStatus', 'createdAt'],
  },
  access: {
    read: async ({ req }) => {
      if (req.user && !(await hasPageAccess(req, 'kog-bingo'))) return false
      return true
    },
    update: async ({ req }) => {
      if (!req.user) return false
      if (!(await hasPageAccess(req, 'kog-bingo'))) return false
      return hasPermission(req, 'games', 'edit_any')
    },
    create: async ({ req }) => {
      if (!req.user) return false
      return hasPageAccess(req, 'kog-bingo')
    },
    delete: async ({ req }) => {
      if (!req.user) return false
      if (!(await hasPageAccess(req, 'kog-bingo'))) return false
      return hasPermission(req, 'games', 'delete_any')
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
      label: 'KoG Category',
      validate: validateCategory,
    },
    {
      name: 'gridSize',
      type: 'select',
      required: true,
      options: BINGO_GRID_SIZES,
      defaultValue: '3x3',
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
      admin: { readOnly: true },
      hooks: {
        beforeChange: [
          ({ req, operation, value }) => {
            if (operation === 'create' && req.user) return req.user.id
            return value
          },
        ],
      },
    },
    {
      name: 'createdVia',
      type: 'select',
      options: [
        { label: 'Web', value: 'web' },
        { label: 'Client', value: 'client' },
      ],
      defaultValue: 'web',
      admin: { readOnly: true },
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
      label: 'Bingo Grid Maps',
      fields: [
        { name: 'mapName', type: 'text', required: true, label: 'Map Name' },
        { name: 'position', type: 'number', required: true, label: 'Grid Position', min: 0, max: 48 },
        { name: 'points', type: 'number', label: 'Points', defaultValue: 0 },
        { name: 'difficulty', type: 'number', label: 'Difficulty (stars)', defaultValue: 0, min: 0, max: 5 },
      ],
    },
    {
      name: 'teams',
      type: 'array',
      required: true,
      label: 'Teams',
      validate: (value, { data }) => {
        if (!value || !Array.isArray(value)) return 'Teams array is required'
        if ((data as any)?.mode === 'solo' && value.length !== 1) return 'Solo mode must have exactly 1 team'
        if ((data as any)?.mode === 'team' && value.length !== 2) return 'Team mode must have exactly 2 teams'
        return true
      },
      fields: [
        { name: 'teamName', type: 'text', required: true, label: 'Team Name', defaultValue: 'Team' },
        { name: 'color', type: 'select', required: true, options: BINGO_TEAM_COLORS, label: 'Team Color' },
        {
          name: 'players',
          type: 'array',
          maxRows: 2,
          label: 'Players',
          fields: [
            { name: 'user', type: 'relationship', relationTo: 'users', required: true, label: 'Player' },
            { name: 'isReady', type: 'checkbox', defaultValue: false, label: 'Ready Status' },
          ],
        },
        {
          name: 'pendingInvites',
          type: 'array',
          label: 'Pending Invites',
          fields: [
            { name: 'user', type: 'relationship', relationTo: 'users', required: true, label: 'Invited Player' },
            { name: 'invitedAt', type: 'date', label: 'Invited At' },
          ],
        },
        {
          name: 'completedCells',
          type: 'array',
          label: 'Completed Cells',
          fields: [
            { name: 'cellPosition', type: 'number', required: true, min: 0, max: 48, label: 'Cell Position' },
            { name: 'completedAt', type: 'date', label: 'Completed At' },
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
    },
    {
      name: 'rematchGame',
      type: 'relationship',
      relationTo: 'kog-bingo',
      label: 'Rematch Game',
    },
  ],
}
