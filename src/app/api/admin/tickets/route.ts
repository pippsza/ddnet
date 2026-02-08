import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@/payload.config'

export async function GET(req: NextRequest) {
  try {
    const payload = await getPayload({ config })
    const { user } = await payload.auth({ headers: req.headers })

    if (!user || user.roles !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const status = req.nextUrl.searchParams.get('status')
    const where: any = {}
    if (status && status !== 'all') {
      where.status = { equals: status }
    }

    const { docs: tickets } = await payload.find({
      collection: 'support',
      where,
      sort: '-createdAt',
      limit: 100,
      depth: 1,
    })

    return NextResponse.json({ tickets })
  } catch (error) {
    console.error('[API] Admin tickets error:', error)
    return NextResponse.json({ error: 'Failed to fetch tickets' }, { status: 500 })
  }
}
