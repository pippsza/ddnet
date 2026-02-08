import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@/payload.config'

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: friendUserId } = await params
    const payload = await getPayload({ config })
    const { user } = await payload.auth({ headers: req.headers })

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Remove from both users' friend lists
    const [currentUser, friendUser] = await Promise.all([
      payload.findByID({ collection: 'users', id: user.id }),
      payload.findByID({ collection: 'users', id: friendUserId }),
    ])

    const updatedCurrentFriends = (currentUser.friend || []).filter((f) => {
      const fId = typeof f.user === 'string' ? f.user : f.user.id
      return fId !== friendUserId
    })

    const updatedFriendFriends = (friendUser.friend || []).filter((f) => {
      const fId = typeof f.user === 'string' ? f.user : f.user.id
      return fId !== user.id
    })

    await Promise.all([
      payload.update({
        collection: 'users',
        id: user.id,
        data: { friend: updatedCurrentFriends },
      }),
      payload.update({
        collection: 'users',
        id: friendUserId,
        data: { friend: updatedFriendFriends },
      }),
    ])

    return NextResponse.json({ success: true })
  } catch (error: unknown) {
    console.error('[API] Error removing friend:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to remove friend' },
      { status: 500 },
    )
  }
}
