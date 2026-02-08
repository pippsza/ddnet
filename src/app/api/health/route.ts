import { NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@/payload.config'

export async function GET() {
  try {
    const payload = await getPayload({ config })

    // Check MongoDB by running a simple query
    await payload.find({ collection: 'users', limit: 1 })

    return NextResponse.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      services: {
        mongodb: 'connected',
        payload: 'ready',
      },
    })
  } catch (error: unknown) {
    return NextResponse.json(
      {
        status: 'error',
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 503 },
    )
  }
}
