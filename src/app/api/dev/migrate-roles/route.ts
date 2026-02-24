import { NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@/payload.config'

/**
 * Migrates users with legacy hardcoded roles (moderator/tester) to the new
 * dynamic roles system: sets roles='player' and assigns the corresponding
 * role record via assignedRoles.
 */
export async function POST() {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not available in production' }, { status: 403 })
  }

  const payload = await getPayload({ config })
  const log: string[] = []

  try {
    // Find or create the dynamic role records
    const roleMap: Record<string, string> = {}

    for (const roleName of ['moderator', 'tester']) {
      const existing = await payload.find({
        collection: 'roles',
        where: { name: { equals: roleName } },
        limit: 1,
      })

      if (existing.docs[0]) {
        roleMap[roleName] = existing.docs[0].id
        log.push(`Found ${roleName} role: ${existing.docs[0].id}`)
      } else {
        log.push(`Warning: ${roleName} role not found in roles collection — run seed first`)
      }
    }

    // Find all users with legacy roles
    for (const legacyRole of ['moderator', 'tester']) {
      const { docs: users } = await payload.find({
        collection: 'users',
        where: { roles: { equals: legacyRole } },
        limit: 500,
        overrideAccess: true,
        depth: 0,
      })

      log.push(`Found ${users.length} users with roles='${legacyRole}'`)

      for (const user of users) {
        const currentAssigned: string[] = (user.assignedRoles as string[]) || []
        const dynamicRoleId = roleMap[legacyRole]

        const newAssigned = dynamicRoleId && !currentAssigned.includes(dynamicRoleId)
          ? [...currentAssigned, dynamicRoleId]
          : currentAssigned

        await payload.update({
          collection: 'users',
          id: user.id,
          overrideAccess: true,
          data: {
            roles: 'player',
            assignedRoles: newAssigned,
          },
        })

        log.push(`  Migrated ${(user as any).ingameNick || user.id}: roles=player, assignedRoles=[${newAssigned.join(', ')}]`)
      }
    }

    log.push('')
    log.push('Migration complete!')

    return NextResponse.json({ success: true, log })
  } catch (error: unknown) {
    console.error('[Migrate Roles] Error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Migration failed', log },
      { status: 500 },
    )
  }
}
