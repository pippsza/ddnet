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

    const body = await req.json()
    const { targetUsername, message } = body

    // Resolve recipient: either by ID directly or look up by username
    let resolvedRecipientId: string | undefined = body.recipientId
    if (!resolvedRecipientId && targetUsername) {
      // Search by both username (login) and ingameNick (display name)
      const { docs: found } = await payload.find({
        collection: 'users',
        where: {
          or: [
            { username: { equals: targetUsername } },
            { ingameNick: { equals: targetUsername } },
          ],
        },
        limit: 1,
      })
      if (found.length === 0) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 })
      }
      resolvedRecipientId = found[0].id
    }

    if (!resolvedRecipientId) {
      return NextResponse.json({ error: 'Recipient ID or username is required' }, { status: 400 })
    }

    if (resolvedRecipientId === user.id) {
      return NextResponse.json({ error: 'Cannot send friend request to yourself' }, { status: 400 })
    }

    // Check if already friends
    const currentUser = await payload.findByID({
      collection: 'users',
      id: user.id,
    })

    const alreadyFriends = currentUser.friend?.some((f) => {
      const friendId = typeof f.user === 'string' ? f.user : f.user.id
      return friendId === resolvedRecipientId
    })

    if (alreadyFriends) {
      return NextResponse.json({ error: 'Already friends' }, { status: 400 })
    }

    // Check for existing pending request
    const { docs: existingRequests } = await payload.find({
      collection: 'friend-requests',
      where: {
        and: [
          {
            or: [
              { and: [{ sender: { equals: user.id } }, { recipient: { equals: resolvedRecipientId } }] },
              { and: [{ sender: { equals: resolvedRecipientId } }, { recipient: { equals: user.id } }] },
            ],
          },
          { status: { equals: 'pending' } },
        ],
      },
      limit: 1,
    })

    if (existingRequests.length > 0) {
      return NextResponse.json({ error: 'Friend request already exists' }, { status: 400 })
    }

    // Create friend request
    const request = await payload.create({
      collection: 'friend-requests',
      data: {
        sender: user.id,
        recipient: resolvedRecipientId,
        status: 'pending',
        message: message || undefined,
      },
    })

    // Create notification for recipient
    await payload.create({
      collection: 'notifications',
      data: {
        recipient: resolvedRecipientId,
        type: 'friend_request',
        title: 'Friend Request',
        message: `${user.username} sent you a friend request`,
        actionUrl: '/app/friends',
        relatedUser: user.id,
        metadata: { requestId: request.id },
      },
    })

    return NextResponse.json({ success: true, requestId: request.id })
  } catch (error: unknown) {
    console.error('[API] Error sending friend request:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to send friend request' },
      { status: 500 },
    )
  }
}
