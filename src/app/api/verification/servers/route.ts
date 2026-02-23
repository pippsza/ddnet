import { NextResponse } from 'next/server'
import { getPayload } from 'payload'
import payloadConfig from '@payload-config'

export async function GET() {
  try {
    const payload = await getPayload({ config: payloadConfig })
    const settings = await payload.findGlobal({ slug: 'verification-settings' })

    return NextResponse.json({
      servers: (settings.servers || []).map((s) => ({
        name: s.name,
        ip: s.ip,
        port: s.port,
        region: s.region || null,
      })),
    })
  } catch (error) {
    console.error('Verification servers error:', error)
    return NextResponse.json({ servers: [] })
  }
}
