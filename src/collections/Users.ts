import type {
  CollectionConfig,
  CollectionAfterChangeHook,
  CollectionBeforeChangeHook,
  PayloadRequest,
  Field,
} from 'payload'
import { APIError } from 'payload'
import {
  getRoleCacheEntry,
  isRoleCachePopulated,
  ensureRoleCachePopulated,
} from '@/lib/permissions'
// DDNET_CATEGORIES import removed — favoriteCategory fields changed from select to text

// ── Helper functions to reduce field repetition ──

const bingoModeStats = (): Field[] => [
  { name: 'gamesPlayed', type: 'number', defaultValue: 0, min: 0 },
  { name: 'gamesWon', type: 'number', defaultValue: 0, min: 0 },
  { name: 'gamesLost', type: 'number', defaultValue: 0, min: 0 },
  { name: 'totalMapsCompleted', type: 'number', defaultValue: 0, min: 0 },
  { name: 'averageGameDuration', type: 'number', defaultValue: 0 },
  { name: 'fastestWin', type: 'number' },
]

const bingoCategory = (name: string, label: string, modes: string[] = ['solo', 'team']): Field => ({
  name,
  type: 'group',
  label,
  fields: modes.map((mode) => ({
    name: mode,
    type: 'group' as const,
    label: mode === 'solo' ? 'Solo Mode' : 'Team Mode',
    fields: bingoModeStats(),
  })),
})

const bingoDdmaxGroup = (): Field => ({
  name: 'ddmax',
  type: 'group',
  label: 'DDmaX',
  fields: [
    { sub: 'easy', label: 'DDmaX.Easy' },
    { sub: 'next', label: 'DDmaX.Next' },
    { sub: 'pro', label: 'DDmaX.Pro' },
    { sub: 'nut', label: 'DDmaX.Nut' },
  ].map(({ sub, label }) => ({
    name: sub,
    type: 'group' as const,
    label,
    fields: ['solo', 'team'].map((mode) => ({
      name: mode,
      type: 'group' as const,
      label: mode === 'solo' ? 'Solo Mode' : 'Team Mode',
      fields: bingoModeStats(),
    })),
  })),
})

const raceCategoryStats = (): Field[] => [
  { name: 'gamesPlayed', type: 'number', defaultValue: 0, min: 0 },
  { name: 'gamesWon', type: 'number', defaultValue: 0, min: 0 },
  { name: 'gamesLost', type: 'number', defaultValue: 0, min: 0 },
  { name: 'totalRoundsWon', type: 'number', defaultValue: 0, min: 0 },
  {
    name: 'bestFinishTime',
    type: 'number',
    admin: { description: 'Best round finish time in seconds' },
  },
  { name: 'averageFinishTime', type: 'number', defaultValue: 0 },
]

const raceCategory = (name: string, label: string): Field => ({
  name,
  type: 'group',
  label,
  fields: raceCategoryStats(),
})

const raceDdmaxGroup = (): Field => ({
  name: 'ddmax',
  type: 'group',
  label: 'DDmaX',
  fields: [
    { sub: 'easy', label: 'DDmaX.Easy' },
    { sub: 'next', label: 'DDmaX.Next' },
    { sub: 'pro', label: 'DDmaX.Pro' },
    { sub: 'nut', label: 'DDmaX.Nut' },
  ].map(({ sub, label }) => ({
    name: sub,
    type: 'group' as const,
    label,
    fields: raceCategoryStats(),
  })),
})

// ── Access control ──

const adminAccessControl = ({ req }: { req: PayloadRequest }): boolean | Promise<boolean> => {
  const user = req.user
  if (!user) return false
  if (!user.roles) return false
  if (user && user?.roles === 'admin') {
    return true // Allow access
  }

  return false // Deny access for all other roles
}

const adminOnlyFieldAccess = {
  create: ({ req }: { req: PayloadRequest }) => req.user?.roles?.includes('admin') ?? false,
  update: ({ req }: { req: PayloadRequest }) => req.user?.roles?.includes('admin') ?? false,
}

// ── Hooks ──

/**
 * Hard Reset Hook for nickname protection
 *
 * ingameNick conflicts:
 * - Verified owner exists → "already protected" (owner proved identity)
 * - Unverified user exists → "already taken, use /claim" (real owner must prove via bot)
 *
 * username conflicts (login name only, no ingameNick overlap):
 * - Unverified → delete and allow re-registration (password reset scenario)
 * - Verified → block
 */
const hardResetHook: CollectionBeforeChangeHook = async ({ data, req, operation }) => {
  if (operation !== 'create' || !data.username) return data

  const payload = req.payload

  // 1. Check ingameNick conflicts first — these always block
  if (data.ingameNick) {
    const nickConflicts = await payload.find({
      collection: 'users',
      where: { ingameNick: { equals: data.ingameNick } },
      limit: 1,
    })

    if (nickConflicts.docs.length > 0) {
      const existing = nickConflicts.docs[0]
      if (existing.isSystemVerified) {
        throw new APIError(
          'This nickname is already protected. The owner has verified their identity.',
          400,
        )
      }
      throw new APIError('This nickname is already taken.', 400)
    }
  }

  // 2. Check username conflicts (only if no ingameNick overlap)
  const usernameConflicts = await payload.find({
    collection: 'users',
    where: { username: { equals: data.username } },
    limit: 10,
  })

  for (const existingUser of usernameConflicts.docs) {
    if (existingUser.isSystemVerified) {
      throw new APIError('This username is already protected. Please choose a different name.', 400)
    }
    // Username-only conflict, unverified — delete to allow re-registration
    await payload.delete({
      collection: 'users',
      id: existingUser.id,
    })
  }

  return data
}

/**
 * After user creation, assign the default role to the new user
 */
const assignDefaultRole: CollectionAfterChangeHook = async ({ doc, operation, req }) => {
  if (operation !== 'create') return doc
  if (doc.roles === 'admin') return doc

  try {
    const { docs: defaultRoles } = await req.payload.find({
      collection: 'roles',
      where: { isDefault: { equals: true } },
      limit: 1,
      depth: 0,
    })

    if (defaultRoles.length === 0) return doc

    await req.payload.update({
      collection: 'users',
      id: doc.id,
      overrideAccess: true,
      data: { assignedRoles: [defaultRoles[0].id] },
    })
  } catch (error) {
    console.error(`[Users] Failed to assign default role to ${doc.ingameNick}:`, error)
  }

  return doc
}

/**
 * After user creation, fetch DDNet stats and populate ingameStats
 */
const syncDDNetOnCreate: CollectionAfterChangeHook = async ({ doc, operation, req }) => {
  if (operation !== 'create' || !doc.ingameNick) return doc

  // Run async — don't block the registration response
  const payload = req.payload
  const userId = doc.id
  const ingameNick = doc.ingameNick

  setImmediate(async () => {
    try {
      const { getPlayerData, getPlayerSkinInfo } = await import('@/lib/ddnet-helpers')
      const [playerData, skinInfo] = await Promise.all([
        getPlayerData(ingameNick, true),
        getPlayerSkinInfo(ingameNick),
      ])

      if (!playerData) return

      await payload.update({
        collection: 'users',
        id: userId,
        overrideAccess: true,
        data: {
          ingameStats: {
            points: playerData.points,
            rank: playerData.rank ?? undefined,
            skin: skinInfo
              ? {
                  name: skinInfo.name,
                  color_body: skinInfo.colorBody,
                  color_feet: skinInfo.colorFeet,
                }
              : undefined,
            lastSyncedAt: new Date().toISOString(),
          },
        },
      })

      console.log(`[Users] Synced DDNet stats for new user ${ingameNick}`)
    } catch (error) {
      console.error(`[Users] Failed to sync DDNet stats for ${ingameNick}:`, error)
    }
  })

  return doc
}

// ── Collection config ──

export const Users: CollectionConfig = {
  slug: 'users',
  admin: {
    useAsTitle: 'ingameNick',
  },
  access: {
    admin: adminAccessControl,
    // Users can read all profiles (for friends, rankings, etc)
    read: () => true,
    // Users can update only their own public fields
    update: ({ req }) => {
      if (!req.user) return false
      // Admins can update everything
      if (req.user.roles === 'admin') return true
      // Regular users can only update their own profile
      return {
        id: { equals: req.user.id },
      }
    },
    create: () => true, // Anyone can register
    delete: ({ req }) => {
      if (!req.user) return false
      return req.user.roles === 'admin'
    },
  },
  auth: {
    useAPIKey: true,
    // Use nickname (name field) as login instead of email
    tokenExpiration: 60 * 60 * 24 * 7, // 7 days
    loginWithUsername: {
      requireEmail: false,
      allowEmailLogin: false,
      requireUsername: true,
    },
  },
  hooks: {
    beforeChange: [hardResetHook],
    afterChange: [assignDefaultRole, syncDDNetOnCreate],
    afterRead: [
      async ({ doc, req }) => {
        // Compute primaryRole for badge display
        if (doc.roles === 'admin') {
          doc.primaryRole = {
            name: 'admin',
            displayName: 'Admin',
            badgeColor: '#dc2626',
            textColor: '#ffffff',
          }
          return doc
        }

        if (Array.isArray(doc.assignedRoles) && doc.assignedRoles.length > 0) {
          // Try populated objects first (depth >= 1 from user query)
          const populated = doc.assignedRoles
            .filter((r: any) => typeof r === 'object' && r !== null)
            .sort((a: any, b: any) => (b.priority || 0) - (a.priority || 0))

          if (populated.length > 0) {
            doc.primaryRole = {
              name: populated[0].name,
              displayName: populated[0].displayName,
              badgeColor: populated[0].badgeColor,
              textColor: populated[0].textColor,
            }
          } else {
            // Fallback: resolve from in-memory cache when roles are ID strings
            // (happens when user is a nested relationship at insufficient depth)
            if (!isRoleCachePopulated()) {
              await ensureRoleCachePopulated(req)
            }
            let best: {
              priority: number
              name: string
              displayName: string
              badgeColor: string
              textColor: string
            } | null = null
            for (const ref of doc.assignedRoles) {
              const roleId = typeof ref === 'string' ? ref : null
              if (!roleId) continue
              const cached = getRoleCacheEntry(roleId)
              if (cached && (!best || cached.priority > best.priority)) {
                best = cached
              }
            }
            if (best) {
              doc.primaryRole = {
                name: best.name,
                displayName: best.displayName,
                badgeColor: best.badgeColor,
                textColor: best.textColor,
              }
            }
          }
        }

        return doc
      },
    ],
  },

  fields: [
    {
      name: 'username',
      type: 'text',
      unique: true,
      required: true,
      label: 'Username (Login)',
      access: {
        read: ({ req, doc }) => {
          if (!req.user || !doc) return false
          return req.user.id === doc.id || req.user.roles === 'admin'
        },
      },
      admin: {
        description: 'Lowercase login name (auto-set by Payload)',
      },
    },
    {
      name: 'ingameNick',
      type: 'text',
      unique: true,
      required: true,
      label: 'In-Game Nickname',
      admin: {
        description: 'Case-sensitive DDNet nickname for verification and display',
      },
    },

    {
      name: 'roles',
      type: 'select',
      required: true,
      options: ['admin', 'player'],
      defaultValue: 'player',
      access: adminOnlyFieldAccess,
    },
    {
      name: 'assignedRoles',
      type: 'relationship',
      relationTo: 'roles',
      hasMany: true,
      label: 'Assigned Roles',
      admin: {
        description: 'Dynamic roles assigned to this user. Permissions merge across all roles.',
      },
      access: adminOnlyFieldAccess,
    },
    {
      name: 'isSystemVerified',
      type: 'checkbox',
      label: 'Is System Verified',
      defaultValue: false,
      access: adminOnlyFieldAccess,
    },
    {
      name: 'lastSeenAt',
      type: 'date',
      admin: { readOnly: true },
    },
    {
      name: 'avatar',
      type: 'upload',
      relationTo: 'media',
      label: 'Avatar',
      access: {
        update: () => true,
      },
    },
    {
      name: 'friend',
      type: 'array',
      label: 'Friends',
      fields: [
        {
          name: 'user',
          type: 'relationship',
          relationTo: 'users',
          required: true,
          label: 'Friend',
        },
        {
          name: 'addedAt',
          type: 'date',
          required: true,
          defaultValue: () => new Date().toISOString(),
        },
        {
          name: 'nickname',
          type: 'text',
          label: 'Custom Nickname',
        },
      ],
      access: {
        update: () => true,
      },
    },
    {
      name: 'ingameStats',
      type: 'group',
      label: 'In-Game Statistics',
      access: adminOnlyFieldAccess,
      fields: [
        { name: 'points', type: 'number', defaultValue: 0 },
        {
          name: 'rank',
          type: 'number',
          admin: { description: 'Global completionist rank from DDNet' },
        },
        {
          name: 'skin',
          type: 'group',
          fields: [
            { name: 'name', type: 'text' },
            { name: 'color_body', type: 'number' },
            { name: 'color_feet', type: 'number' },
          ],
        },
        {
          name: 'lastSyncedAt',
          type: 'date',
          admin: {
            readOnly: true,
            description: 'Last time DDNet stats were synced',
          },
        },
      ],
    },

    // ── Game tracking (shared across bingo & races) ──

    {
      name: 'activeGame',
      type: 'relationship',
      relationTo: ['bingo', 'races', 'kog-bingo', 'kog-races'],
      label: 'Active Game',
      admin: {
        description: 'Current game (bingo, race, KoG bingo, or KoG race) with status "waiting", "ready" or "in_progress"',
      },
    },
    {
      name: 'completedGames',
      type: 'relationship',
      relationTo: ['bingo', 'races', 'kog-bingo', 'kog-races'],
      hasMany: true,
      label: 'Completed Games',
      admin: {
        description: 'History of all played games (bingo, races, KoG bingo, KoG races)',
      },
    },

    // ── Bingo statistics ──

    {
      name: 'bingo',
      type: 'group',
      label: 'Bingo Statistics',
      access: adminOnlyFieldAccess,
      fields: [
        // Per-category stats
        bingoCategory('novice', 'Novice'),
        bingoCategory('moderate', 'Moderate'),
        bingoCategory('brutal', 'Brutal'),
        bingoCategory('insane', 'Insane'),
        bingoCategory('dummy', 'Dummy'),
        bingoDdmaxGroup(),
        bingoCategory('oldschool', 'Oldschool'),
        bingoCategory('solo_maps', 'Solo Maps', ['solo']),
        bingoCategory('race', 'Race', ['solo']),
        // Global bingo stats
        {
          name: 'totalGamesPlayed',
          type: 'number',
          defaultValue: 0,
          min: 0,
          label: 'Total Bingo Games Played',
          admin: { readOnly: true, description: 'Calculated automatically' },
        },
        {
          name: 'totalGamesWon',
          type: 'number',
          defaultValue: 0,
          min: 0,
          label: 'Total Bingo Wins',
          admin: { readOnly: true, description: 'Calculated automatically' },
        },
        {
          name: 'winRate',
          type: 'number',
          defaultValue: 0,
          min: 0,
          max: 100,
          label: 'Bingo Win Rate (%)',
          admin: {
            readOnly: true,
            description: 'Calculated automatically (totalWins / totalPlayed * 100)',
          },
        },
        {
          name: 'favoriteCategory',
          type: 'text',
          label: 'Favorite Bingo Category',
          admin: { description: 'Automatically determined by most played category' },
        },
      ],
    },

    // ── Race statistics ──

    {
      name: 'raceStats',
      type: 'group',
      label: 'Race Statistics',
      access: adminOnlyFieldAccess,
      fields: [
        // Per-category stats
        raceCategory('novice', 'Novice'),
        raceCategory('moderate', 'Moderate'),
        raceCategory('brutal', 'Brutal'),
        raceCategory('insane', 'Insane'),
        raceCategory('dummy', 'Dummy'),
        raceDdmaxGroup(),
        raceCategory('oldschool', 'Oldschool'),
        raceCategory('solo_maps', 'Solo Maps'),
        raceCategory('race', 'Race'),
        // Global race stats
        {
          name: 'totalRacesPlayed',
          type: 'number',
          defaultValue: 0,
          min: 0,
          label: 'Total Races Played',
          admin: { readOnly: true, description: 'Calculated automatically' },
        },
        {
          name: 'totalRacesWon',
          type: 'number',
          defaultValue: 0,
          min: 0,
          label: 'Total Race Wins',
          admin: { readOnly: true, description: 'Calculated automatically' },
        },
        {
          name: 'winRate',
          type: 'number',
          defaultValue: 0,
          min: 0,
          max: 100,
          label: 'Race Win Rate (%)',
          admin: { readOnly: true, description: 'Calculated automatically' },
        },
        {
          name: 'favoriteCategory',
          type: 'text',
          label: 'Favorite Race Category',
          admin: { description: 'Automatically determined by most played category' },
        },
      ],
    },
    {
      name: 'savedLoginToken',
      type: 'text',
      label: 'Saved In-Game Login Token',
      hidden: true,
      admin: {
        description: 'Encrypted login token for auto-login on game servers',
        readOnly: true,
      },
      access: {
        read: () => false,
        update: () => false,
      },
    },
    {
      name: 'clientToken',
      type: 'text',
      unique: true,
      label: 'Client Linking Token',
      hidden: true,
      admin: {
        description: 'Bearer token for DDNet client account linking and finish hints',
        readOnly: true,
      },
      access: {
        read: ({ req, doc }: { req: PayloadRequest; doc?: any }) => {
          if (!req.user || !doc) return false
          return req.user.id === doc.id || req.user.roles === 'admin'
        },
        update: () => false,
      },
    },
    {
      name: 'notificationRetention',
      type: 'select',
      defaultValue: '5d',
      label: 'Notification Retention',
      options: [
        { label: '1 Hour', value: '1h' },
        { label: '24 Hours', value: '24h' },
        { label: '5 Days', value: '5d' },
        { label: '10 Days', value: '10d' },
      ],
      admin: {
        description: 'How long notifications are kept before automatic deletion',
      },
    },
  ],
}
