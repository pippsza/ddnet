import type { Payload } from 'payload'
import { ALL_PAGE_PERMISSIONS } from '@/collections/Roles'

/**
 * Ensure a default role exists for all non-admin users.
 * Called once at server startup. Creates the "User" role if no default role exists.
 */
export async function ensureDefaultRole(payload: Payload): Promise<void> {
  try {
    const existing = await payload.find({
      collection: 'roles',
      where: { isDefault: { equals: true } },
      limit: 1,
      depth: 0,
    })

    if (existing.docs.length > 0) {
      console.log(`[DefaultRole] Default role "${existing.docs[0].name}" already exists`)
      return
    }

    await payload.create({
      collection: 'roles',
      data: {
        name: 'user',
        displayName: 'User',
        priority: -1,
        badgeColor: '#6b7280',
        textColor: '#ffffff',
        isDefault: true,
        permissions: {
          pages: [...ALL_PAGE_PERMISSIONS],
          articles: [],
          support: [],
          forum: [],
          games: [],
          adminPages: [],
        },
      },
    })

    console.log('[DefaultRole] Created default "User" role with all pages enabled')
  } catch (err) {
    console.error('[DefaultRole] Failed to ensure default role:', err)
  }
}
