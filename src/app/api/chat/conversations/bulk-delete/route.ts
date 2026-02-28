import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@/payload.config'

export async function POST(req: NextRequest) {
  try {
    const payload = await getPayload({ config })
    const { user } = await payload.auth({ headers: req.headers })

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { ids } = await req.json()
    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: 'ids array is required' }, { status: 400 })
    }

    let deleted = 0

    for (const id of ids) {
      try {
        const conversation = await payload.findByID({
          collection: 'conversations',
          id,
          depth: 0,
        })

        if (!conversation) continue

        const isParticipant = (conversation.participants || []).some(
          (p: any) => {
            const uid = typeof p.user === 'object' ? p.user.id : p.user
            return uid === user.id
          },
        )

        if (!isParticipant) continue

        const currentDeletedBy = (conversation.deletedBy || []).map((u: any) =>
          typeof u === 'object' ? u.id : u,
        )
        if (!currentDeletedBy.includes(user.id)) {
          currentDeletedBy.push(user.id)
        }

        await payload.update({
          collection: 'conversations',
          id,
          data: { deletedBy: currentDeletedBy },
          overrideAccess: true,
        })

        deleted++
      } catch {
        // Skip individual errors
      }
    }

    return NextResponse.json({ deleted })
  } catch (error) {
    console.error('[API] Chat bulk delete error:', error)
    return NextResponse.json({ error: 'Failed to delete conversations' }, { status: 500 })
  }
}
