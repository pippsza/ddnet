import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@/payload.config'

interface DockerEvent {
  type: string
  action: string
  actor: string
  time: string
}

export async function GET(req: NextRequest) {
  try {
    const payload = await getPayload({ config })
    const { user } = await payload.auth({ headers: req.headers })

    if (!user || (user.roles !== 'admin' && user.roles !== 'moderator')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { searchParams } = req.nextUrl
    const sinceParam = searchParams.get('since')
    const now = Math.floor(Date.now() / 1000)
    const since = sinceParam ? parseInt(sinceParam, 10) : now - 300 // last 5 min by default

    let events: DockerEvent[] = []
    try {
      const Docker = (await import('dockerode')).default
      const dockerClient = new Docker({ socketPath: '/var/run/docker.sock' })

      const stream = (await dockerClient.getEvents({
        since,
        until: now,
        filters: { type: ['container'] },
      })) as NodeJS.ReadableStream

      const raw = await new Promise<string>((resolve, reject) => {
        const chunks: Buffer[] = []
        stream.on('data', (chunk: Buffer) => chunks.push(chunk))
        stream.on('end', () => resolve(Buffer.concat(chunks).toString()))
        stream.on('error', reject)
        // Safety timeout
        setTimeout(() => {
          stream.removeAllListeners()
          resolve(Buffer.concat(chunks).toString())
        }, 3000)
      })

      events = raw
        .split('\n')
        .filter(Boolean)
        .map((line) => {
          try {
            const e = JSON.parse(line)
            return {
              type: e.Type || 'container',
              action: e.Action || 'unknown',
              actor: e.Actor?.Attributes?.name || e.Actor?.ID?.slice(0, 12) || 'unknown',
              time: new Date((e.time || 0) * 1000).toISOString(),
            }
          } catch {
            return null
          }
        })
        .filter((e): e is DockerEvent => e !== null)
    } catch {
      // Docker not available
    }

    return NextResponse.json({ events, serverTime: now })
  } catch (error: unknown) {
    console.error('[API] Error fetching Docker events:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch events' },
      { status: 500 },
    )
  }
}
