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

    const { requestId, action } = await req.json()

    if (!requestId || !action) {
      return NextResponse.json({ error: 'Request ID and action are required' }, { status: 400 })
    }

    if (!['accept', 'reject'].includes(action)) {
      return NextResponse.json({ error: 'Action must be "accept" or "reject"' }, { status: 400 })
    }

    const friendRequest = await payload.findByID({
      collection: 'friend-requests',
      id: requestId,
      depth: 1,
    })

    if (!friendRequest) {
      return NextResponse.json({ error: 'Request not found' }, { status: 404 })
    }

    // Only recipient can respond
    const recipientId =
      typeof friendRequest.recipient === 'string'
        ? friendRequest.recipient
        : friendRequest.recipient.id

    if (recipientId !== user.id) {
      return NextResponse.json({ error: 'Not authorized to respond to this request' }, { status: 403 })
    }

    if (friendRequest.status !== 'pending') {
      return NextResponse.json({ error: 'Request already processed' }, { status: 400 })
    }

    // Update request status
    await payload.update({
      collection: 'friend-requests',
      id: requestId,
      data: { status: action === 'accept' ? 'accepted' : 'rejected' },
    })

    if (action === 'accept') {
      const senderId =
        typeof friendRequest.sender === 'string'
          ? friendRequest.sender
          : friendRequest.sender.id

      // Add to both users' friend lists
      const [sender, recipient] = await Promise.all([
        payload.findByID({ collection: 'users', id: senderId }),
        payload.findByID({ collection: 'users', id: user.id }),
      ])

      const senderFriends = [...(sender.friend || [])]
      const recipientFriends = [...(recipient.friend || [])]

      const now = new Date().toISOString()

      senderFriends.push({ user: user.id, addedAt: now })
      recipientFriends.push({ user: senderId, addedAt: now })

      await Promise.all([
        payload.update({
          collection: 'users',
          id: senderId,
          data: { friend: senderFriends },
        }),
        payload.update({
          collection: 'users',
          id: user.id,
          data: { friend: recipientFriends },
        }),
      ])

      // Notify the sender
      await payload.create({
        collection: 'notifications',
        data: {
          recipient: senderId,
          type: 'friend_accepted',
          title: 'Friend Request Accepted',
          message: `${user.ingameNick || user.username} accepted your friend request`,
          actionUrl: '/app/friends',
          relatedUser: user.id,
        },
      })
    }

    return NextResponse.json({ success: true, action })
  } catch (error: unknown) {
    console.error('[API] Error processing friend request:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to process request' },
      { status: 500 },
    )
  }
}
