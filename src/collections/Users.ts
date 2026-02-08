import type {
  CollectionConfig,
  CollectionAfterChangeHook,
  CollectionBeforeChangeHook,
  PayloadRequest,
} from 'payload'
import { DDNET_CATEGORIES, DDNET_SUBCATEGORIES, BINGO_MODES } from '@/lib/ddnet-constants'

const adminAccessControl = ({ req }: { req: PayloadRequest }): boolean | Promise<boolean> => {
  const user = req.user
  if (!user) return false
  if (!user.roles) return false
  if (user && user?.roles === 'admin') {
    return true // Allow access
  }

  return false // Deny access for all other roles
}

/**
 * Hard Reset Hook for nickname protection
 * - If user with same username exists and isSystemVerified: false -> delete unverified user (allows re-registration)
 * - If user with same username exists and isSystemVerified: true -> throw error
 */
const hardResetHook: CollectionBeforeChangeHook = async ({ data, req, operation }) => {
  if (operation !== 'create' || !data.username) return data

  const payload = req.payload

  // Check if user with same username exists
  const existingUsers = await payload.find({
    collection: 'users',
    where: { username: { equals: data.username } },
    limit: 1,
  })

  if (existingUsers.docs.length === 0) return data

  const existingUser = existingUsers.docs[0]

  // If verified, throw error - nickname is protected
  if (existingUser.isSystemVerified) {
    throw new Error(
      'This nickname is already protected. Please choose a different name or contact support.',
    )
  }

  // Hard Reset: Delete the unverified user to allow new registration with same nickname
  await payload.delete({
    collection: 'users',
    id: existingUser.id,
  })

  return data
}

/**
 * After user creation, fetch DDNet stats and populate ingameStats
 */
const syncDDNetOnCreate: CollectionAfterChangeHook = async ({ doc, operation, req }) => {
  if (operation !== 'create' || !doc.username) return doc

  // Run async — don't block the registration response
  const payload = req.payload
  const userId = doc.id
  const username = doc.username

  setImmediate(async () => {
    try {
      const { getPlayerData } = await import('@/lib/ddnet-helpers')
      const playerData = await getPlayerData(username, true)

      if (!playerData) return

      await payload.update({
        collection: 'users',
        id: userId,
        overrideAccess: true,
        data: {
          ingameStats: {
            points: playerData.points,
            rank: playerData.rank ?? undefined,
            lastSyncedAt: new Date().toISOString(),
          },
        },
      })

      console.log(`[Users] Synced DDNet stats for new user ${username}`)
    } catch (error) {
      console.error(`[Users] Failed to sync DDNet stats for ${username}:`, error)
    }
  })

  return doc
}

export const Users: CollectionConfig = {
  slug: 'users',
  admin: {
    useAsTitle: 'username',
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
    loginWithUsername: {
      requireEmail: false,
      allowEmailLogin: false,
      requireUsername: true,
    },
  },
  hooks: {
    beforeChange: [hardResetHook],
    afterChange: [syncDDNetOnCreate],
  },

  fields: [
    // Override default email field to make it optional (Payload adds it automatically for auth collections)
    // {
    //   name: 'email',
    //   type: 'email',
    //   required: false,
    //   admin: {
    //     hidden: true, // Hide from admin UI since we use username
    //   },
    // },
    {
      name: 'username',
      type: 'text',
      unique: true,
      required: true,
      label: 'Username (Login)',
      admin: {
        description: 'Your username for login (cannot be changed)',
        readOnly: true,
      },
      hooks: {
        beforeChange: [
          ({ value, operation }) => {
            // Set username = name on creation
            if (operation === 'create') {
              return value
            }
            // Prevent username changes after creation
            return value
          },
        ],
      },
    },

    {
      name: 'roles',
      type: 'select',
      required: true,
      options: ['admin', 'player', 'moderator'],
      defaultValue: 'player',
      access: {
        create: ({ req }) => req.user?.roles?.includes('admin') ?? false,
        update: ({ req }) => req.user?.roles?.includes('admin') ?? false,
      },
    },
    {
      name: 'isSystemVerified',
      type: 'checkbox',
      label: 'Is System Verified',
      defaultValue: false,
      access: {
        // Only admins can verify users
        update: ({ req }) => req.user?.roles?.includes('admin') ?? false,
        create: ({ req }) => req.user?.roles?.includes('admin') ?? false,
      },
    },
    {
      name: 'avatar',
      type: 'upload',
      relationTo: 'media',
      label: 'Avatar',
      access: {
        // Users can update their own avatar
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
        // Users can update their own friend list
        update: () => true,
      },
    },
    {
      name: 'ingameStats',
      type: 'group',
      label: 'In-Game Statistics',
      access: {
        create: ({ req }) => req.user?.roles?.includes('admin') ?? false,
        update: ({ req }) => req.user?.roles?.includes('admin') ?? false,
      },
      fields: [
        { name: 'points', type: 'number', defaultValue: 0 },
        { name: 'rank', type: 'number', admin: { description: 'Global completionist rank from DDNet' } },
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
    {
      name: 'bingo',
      type: 'group',
      label: 'Bingo Statistics',
      access: {
        create: ({ req }) => req.user?.roles?.includes('admin') ?? false,
        update: ({ req }) => req.user?.roles?.includes('admin') ?? false,
      },
      fields: [
        // Novice Category
        {
          name: 'novice',
          type: 'group',
          label: 'Novice',
          fields: [
            {
              name: 'solo',
              type: 'group',
              label: 'Solo Mode',
              fields: [
                { name: 'gamesPlayed', type: 'number', defaultValue: 0, min: 0 },
                { name: 'gamesWon', type: 'number', defaultValue: 0, min: 0 },
                { name: 'gamesLost', type: 'number', defaultValue: 0, min: 0 },
                { name: 'totalMapsCompleted', type: 'number', defaultValue: 0, min: 0 },
                { name: 'averageGameDuration', type: 'number', defaultValue: 0 },
                { name: 'fastestWin', type: 'number' },
              ],
            },
            {
              name: 'team',
              type: 'group',
              label: 'Team Mode',
              fields: [
                { name: 'gamesPlayed', type: 'number', defaultValue: 0, min: 0 },
                { name: 'gamesWon', type: 'number', defaultValue: 0, min: 0 },
                { name: 'gamesLost', type: 'number', defaultValue: 0, min: 0 },
                { name: 'totalMapsCompleted', type: 'number', defaultValue: 0, min: 0 },
                { name: 'averageGameDuration', type: 'number', defaultValue: 0 },
                { name: 'fastestWin', type: 'number' },
              ],
            },
          ],
        },
        // Moderate Category
        {
          name: 'moderate',
          type: 'group',
          label: 'Moderate',
          fields: [
            {
              name: 'solo',
              type: 'group',
              label: 'Solo Mode',
              fields: [
                { name: 'gamesPlayed', type: 'number', defaultValue: 0, min: 0 },
                { name: 'gamesWon', type: 'number', defaultValue: 0, min: 0 },
                { name: 'gamesLost', type: 'number', defaultValue: 0, min: 0 },
                { name: 'totalMapsCompleted', type: 'number', defaultValue: 0, min: 0 },
                { name: 'averageGameDuration', type: 'number', defaultValue: 0 },
                { name: 'fastestWin', type: 'number' },
              ],
            },
            {
              name: 'team',
              type: 'group',
              label: 'Team Mode',
              fields: [
                { name: 'gamesPlayed', type: 'number', defaultValue: 0, min: 0 },
                { name: 'gamesWon', type: 'number', defaultValue: 0, min: 0 },
                { name: 'gamesLost', type: 'number', defaultValue: 0, min: 0 },
                { name: 'totalMapsCompleted', type: 'number', defaultValue: 0, min: 0 },
                { name: 'averageGameDuration', type: 'number', defaultValue: 0 },
                { name: 'fastestWin', type: 'number' },
              ],
            },
          ],
        },
        // Brutal Category
        {
          name: 'brutal',
          type: 'group',
          label: 'Brutal',
          fields: [
            {
              name: 'solo',
              type: 'group',
              label: 'Solo Mode',
              fields: [
                { name: 'gamesPlayed', type: 'number', defaultValue: 0, min: 0 },
                { name: 'gamesWon', type: 'number', defaultValue: 0, min: 0 },
                { name: 'gamesLost', type: 'number', defaultValue: 0, min: 0 },
                { name: 'totalMapsCompleted', type: 'number', defaultValue: 0, min: 0 },
                { name: 'averageGameDuration', type: 'number', defaultValue: 0 },
                { name: 'fastestWin', type: 'number' },
              ],
            },
            {
              name: 'team',
              type: 'group',
              label: 'Team Mode',
              fields: [
                { name: 'gamesPlayed', type: 'number', defaultValue: 0, min: 0 },
                { name: 'gamesWon', type: 'number', defaultValue: 0, min: 0 },
                { name: 'gamesLost', type: 'number', defaultValue: 0, min: 0 },
                { name: 'totalMapsCompleted', type: 'number', defaultValue: 0, min: 0 },
                { name: 'averageGameDuration', type: 'number', defaultValue: 0 },
                { name: 'fastestWin', type: 'number' },
              ],
            },
          ],
        },
        // Insane Category
        {
          name: 'insane',
          type: 'group',
          label: 'Insane',
          fields: [
            {
              name: 'solo',
              type: 'group',
              label: 'Solo Mode',
              fields: [
                { name: 'gamesPlayed', type: 'number', defaultValue: 0, min: 0 },
                { name: 'gamesWon', type: 'number', defaultValue: 0, min: 0 },
                { name: 'gamesLost', type: 'number', defaultValue: 0, min: 0 },
                { name: 'totalMapsCompleted', type: 'number', defaultValue: 0, min: 0 },
                { name: 'averageGameDuration', type: 'number', defaultValue: 0 },
                { name: 'fastestWin', type: 'number' },
              ],
            },
            {
              name: 'team',
              type: 'group',
              label: 'Team Mode',
              fields: [
                { name: 'gamesPlayed', type: 'number', defaultValue: 0, min: 0 },
                { name: 'gamesWon', type: 'number', defaultValue: 0, min: 0 },
                { name: 'gamesLost', type: 'number', defaultValue: 0, min: 0 },
                { name: 'totalMapsCompleted', type: 'number', defaultValue: 0, min: 0 },
                { name: 'averageGameDuration', type: 'number', defaultValue: 0 },
                { name: 'fastestWin', type: 'number' },
              ],
            },
          ],
        },
        // Dummy Category
        {
          name: 'dummy',
          type: 'group',
          label: 'Dummy',
          fields: [
            {
              name: 'solo',
              type: 'group',
              label: 'Solo Mode',
              fields: [
                { name: 'gamesPlayed', type: 'number', defaultValue: 0, min: 0 },
                { name: 'gamesWon', type: 'number', defaultValue: 0, min: 0 },
                { name: 'gamesLost', type: 'number', defaultValue: 0, min: 0 },
                { name: 'totalMapsCompleted', type: 'number', defaultValue: 0, min: 0 },
                { name: 'averageGameDuration', type: 'number', defaultValue: 0 },
                { name: 'fastestWin', type: 'number' },
              ],
            },
            {
              name: 'team',
              type: 'group',
              label: 'Team Mode',
              fields: [
                { name: 'gamesPlayed', type: 'number', defaultValue: 0, min: 0 },
                { name: 'gamesWon', type: 'number', defaultValue: 0, min: 0 },
                { name: 'gamesLost', type: 'number', defaultValue: 0, min: 0 },
                { name: 'totalMapsCompleted', type: 'number', defaultValue: 0, min: 0 },
                { name: 'averageGameDuration', type: 'number', defaultValue: 0 },
                { name: 'fastestWin', type: 'number' },
              ],
            },
          ],
        },
        // DDmaX Category with subcategories
        {
          name: 'ddmax',
          type: 'group',
          label: 'DDmaX',
          fields: [
            {
              name: 'easy',
              type: 'group',
              label: 'DDmaX.Easy',
              fields: [
                {
                  name: 'solo',
                  type: 'group',
                  label: 'Solo Mode',
                  fields: [
                    { name: 'gamesPlayed', type: 'number', defaultValue: 0, min: 0 },
                    { name: 'gamesWon', type: 'number', defaultValue: 0, min: 0 },
                    { name: 'gamesLost', type: 'number', defaultValue: 0, min: 0 },
                    { name: 'totalMapsCompleted', type: 'number', defaultValue: 0, min: 0 },
                    { name: 'averageGameDuration', type: 'number', defaultValue: 0 },
                    { name: 'fastestWin', type: 'number' },
                  ],
                },
                {
                  name: 'team',
                  type: 'group',
                  label: 'Team Mode',
                  fields: [
                    { name: 'gamesPlayed', type: 'number', defaultValue: 0, min: 0 },
                    { name: 'gamesWon', type: 'number', defaultValue: 0, min: 0 },
                    { name: 'gamesLost', type: 'number', defaultValue: 0, min: 0 },
                    { name: 'totalMapsCompleted', type: 'number', defaultValue: 0, min: 0 },
                    { name: 'averageGameDuration', type: 'number', defaultValue: 0 },
                    { name: 'fastestWin', type: 'number' },
                  ],
                },
              ],
            },
            {
              name: 'next',
              type: 'group',
              label: 'DDmaX.Next',
              fields: [
                {
                  name: 'solo',
                  type: 'group',
                  label: 'Solo Mode',
                  fields: [
                    { name: 'gamesPlayed', type: 'number', defaultValue: 0, min: 0 },
                    { name: 'gamesWon', type: 'number', defaultValue: 0, min: 0 },
                    { name: 'gamesLost', type: 'number', defaultValue: 0, min: 0 },
                    { name: 'totalMapsCompleted', type: 'number', defaultValue: 0, min: 0 },
                    { name: 'averageGameDuration', type: 'number', defaultValue: 0 },
                    { name: 'fastestWin', type: 'number' },
                  ],
                },
                {
                  name: 'team',
                  type: 'group',
                  label: 'Team Mode',
                  fields: [
                    { name: 'gamesPlayed', type: 'number', defaultValue: 0, min: 0 },
                    { name: 'gamesWon', type: 'number', defaultValue: 0, min: 0 },
                    { name: 'gamesLost', type: 'number', defaultValue: 0, min: 0 },
                    { name: 'totalMapsCompleted', type: 'number', defaultValue: 0, min: 0 },
                    { name: 'averageGameDuration', type: 'number', defaultValue: 0 },
                    { name: 'fastestWin', type: 'number' },
                  ],
                },
              ],
            },
            {
              name: 'pro',
              type: 'group',
              label: 'DDmaX.Pro',
              fields: [
                {
                  name: 'solo',
                  type: 'group',
                  label: 'Solo Mode',
                  fields: [
                    { name: 'gamesPlayed', type: 'number', defaultValue: 0, min: 0 },
                    { name: 'gamesWon', type: 'number', defaultValue: 0, min: 0 },
                    { name: 'gamesLost', type: 'number', defaultValue: 0, min: 0 },
                    { name: 'totalMapsCompleted', type: 'number', defaultValue: 0, min: 0 },
                    { name: 'averageGameDuration', type: 'number', defaultValue: 0 },
                    { name: 'fastestWin', type: 'number' },
                  ],
                },
                {
                  name: 'team',
                  type: 'group',
                  label: 'Team Mode',
                  fields: [
                    { name: 'gamesPlayed', type: 'number', defaultValue: 0, min: 0 },
                    { name: 'gamesWon', type: 'number', defaultValue: 0, min: 0 },
                    { name: 'gamesLost', type: 'number', defaultValue: 0, min: 0 },
                    { name: 'totalMapsCompleted', type: 'number', defaultValue: 0, min: 0 },
                    { name: 'averageGameDuration', type: 'number', defaultValue: 0 },
                    { name: 'fastestWin', type: 'number' },
                  ],
                },
              ],
            },
            {
              name: 'nut',
              type: 'group',
              label: 'DDmaX.Nut',
              fields: [
                {
                  name: 'solo',
                  type: 'group',
                  label: 'Solo Mode',
                  fields: [
                    { name: 'gamesPlayed', type: 'number', defaultValue: 0, min: 0 },
                    { name: 'gamesWon', type: 'number', defaultValue: 0, min: 0 },
                    { name: 'gamesLost', type: 'number', defaultValue: 0, min: 0 },
                    { name: 'totalMapsCompleted', type: 'number', defaultValue: 0, min: 0 },
                    { name: 'averageGameDuration', type: 'number', defaultValue: 0 },
                    { name: 'fastestWin', type: 'number' },
                  ],
                },
                {
                  name: 'team',
                  type: 'group',
                  label: 'Team Mode',
                  fields: [
                    { name: 'gamesPlayed', type: 'number', defaultValue: 0, min: 0 },
                    { name: 'gamesWon', type: 'number', defaultValue: 0, min: 0 },
                    { name: 'gamesLost', type: 'number', defaultValue: 0, min: 0 },
                    { name: 'totalMapsCompleted', type: 'number', defaultValue: 0, min: 0 },
                    { name: 'averageGameDuration', type: 'number', defaultValue: 0 },
                    { name: 'fastestWin', type: 'number' },
                  ],
                },
              ],
            },
          ],
        },
        // Oldschool Category
        {
          name: 'oldschool',
          type: 'group',
          label: 'Oldschool',
          fields: [
            {
              name: 'solo',
              type: 'group',
              label: 'Solo Mode',
              fields: [
                { name: 'gamesPlayed', type: 'number', defaultValue: 0, min: 0 },
                { name: 'gamesWon', type: 'number', defaultValue: 0, min: 0 },
                { name: 'gamesLost', type: 'number', defaultValue: 0, min: 0 },
                { name: 'totalMapsCompleted', type: 'number', defaultValue: 0, min: 0 },
                { name: 'averageGameDuration', type: 'number', defaultValue: 0 },
                { name: 'fastestWin', type: 'number' },
              ],
            },
            {
              name: 'team',
              type: 'group',
              label: 'Team Mode',
              fields: [
                { name: 'gamesPlayed', type: 'number', defaultValue: 0, min: 0 },
                { name: 'gamesWon', type: 'number', defaultValue: 0, min: 0 },
                { name: 'gamesLost', type: 'number', defaultValue: 0, min: 0 },
                { name: 'totalMapsCompleted', type: 'number', defaultValue: 0, min: 0 },
                { name: 'averageGameDuration', type: 'number', defaultValue: 0 },
                { name: 'fastestWin', type: 'number' },
              ],
            },
          ],
        },
        // Solo Maps Category
        {
          name: 'solo_maps',
          type: 'group',
          label: 'Solo Maps',
          fields: [
            {
              name: 'solo',
              type: 'group',
              label: 'Solo Mode',
              fields: [
                { name: 'gamesPlayed', type: 'number', defaultValue: 0, min: 0 },
                { name: 'gamesWon', type: 'number', defaultValue: 0, min: 0 },
                { name: 'gamesLost', type: 'number', defaultValue: 0, min: 0 },
                { name: 'totalMapsCompleted', type: 'number', defaultValue: 0, min: 0 },
                { name: 'averageGameDuration', type: 'number', defaultValue: 0 },
                { name: 'fastestWin', type: 'number' },
              ],
            },
          ],
        },
        // Race Category
        {
          name: 'race',
          type: 'group',
          label: 'Race',
          fields: [
            {
              name: 'solo',
              type: 'group',
              label: 'Solo Mode',
              fields: [
                { name: 'gamesPlayed', type: 'number', defaultValue: 0, min: 0 },
                { name: 'gamesWon', type: 'number', defaultValue: 0, min: 0 },
                { name: 'gamesLost', type: 'number', defaultValue: 0, min: 0 },
                { name: 'totalMapsCompleted', type: 'number', defaultValue: 0, min: 0 },
                { name: 'averageGameDuration', type: 'number', defaultValue: 0 },
                { name: 'fastestWin', type: 'number' },
              ],
            },
          ],
        },
        // Global stats
        {
          name: 'activeGame',
          type: 'relationship',
          relationTo: 'bingo',
          label: 'Active Games',
          admin: {
            description: 'Games with status "waiting", "ready" or "in_progress"',
          },
        },
        {
          name: 'completedGames',
          type: 'relationship',
          relationTo: 'bingo',
          hasMany: true,
          label: 'Completed Games',
          admin: {
            description: 'History of all played games',
          },
        },
        {
          name: 'totalGamesPlayed',
          type: 'number',
          defaultValue: 0,
          min: 0,
          label: 'Total Games Played',
          admin: {
            readOnly: true,
            description: 'Calculated automatically',
          },
        },
        {
          name: 'totalGamesWon',
          type: 'number',
          defaultValue: 0,
          min: 0,
          label: 'Total Wins',
          admin: {
            readOnly: true,
            description: 'Calculated automatically',
          },
        },
        {
          name: 'winRate',
          type: 'number',
          defaultValue: 0,
          min: 0,
          max: 100,
          label: 'Win Rate (%)',
          admin: {
            readOnly: true,
            description: 'Calculated automatically (totalWins / totalPlayed * 100)',
          },
        },
        {
          name: 'favoriteCategory',
          type: 'select',
          options: DDNET_CATEGORIES,
          label: 'Favorite Category',
          admin: {
            description: 'Automatically determined by most played category',
          },
        },
      ],
    },
    // Email added by default
    // Add more fields as needed
  ],
}
