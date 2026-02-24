import { NextRequest, NextResponse } from 'next/server'
import { requireAdminPage } from '@/lib/api-auth'
import os from 'os'

export async function GET(req: NextRequest) {
  try {
    const result = await requireAdminPage(req, 'debug')
    if (result instanceof NextResponse) return result

    const mem = process.memoryUsage()
    const totalMem = os.totalmem()
    const freeMem = os.freemem()

    const server = {
      totalMemory: totalMem,
      freeMemory: freeMem,
      usedMemory: totalMem - freeMem,
      cpuCores: os.cpus().length,
      loadAverage: os.loadavg(),
      uptime: os.uptime(),
      platform: os.platform(),
      hostname: os.hostname(),
    }

    const proc = {
      pid: process.pid,
      uptime: process.uptime(),
      nodeVersion: process.version,
      heapUsed: mem.heapUsed,
      heapTotal: mem.heapTotal,
      rss: mem.rss,
      external: mem.external,
    }

    let docker: { version: string; containers: number; images: number } | null = null
    try {
      const Docker = (await import('dockerode')).default
      const dockerClient = new Docker({ socketPath: '/var/run/docker.sock' })
      const info = await dockerClient.info()
      docker = {
        version: info.ServerVersion,
        containers: info.Containers,
        images: info.Images,
      }
    } catch {
      // Docker not available
    }

    return NextResponse.json({ server, process: proc, docker })
  } catch (error: unknown) {
    console.error('[API] Error fetching system info:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch system info' },
      { status: 500 },
    )
  }
}
