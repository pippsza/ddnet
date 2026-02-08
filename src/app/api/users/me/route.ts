import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@/payload.config'

export async function GET(req: NextRequest) {
  try {
    const payload = await getPayload({ config })
    const { user } = await payload.auth({ headers: req.headers })

    if (!user) {
      return NextResponse.json({ user: null }, { status: 401 })
    }

    // Fetch full user with populated relationships
    const fullUser = await payload.findByID({
      collection: 'users',
      id: user.id,
      depth: 1,
    })

    return NextResponse.json({ user: fullUser })
  } catch (error: unknown) {
    console.error('[API] Error fetching current user:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch user' },
      { status: 500 },
    )
  }
}
