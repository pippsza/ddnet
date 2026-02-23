'use client'

import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { useRouter } from 'next/navigation'
import { AuthCard } from '@/components/auth/AuthCard'
import { VerificationStatus } from '@/components/auth/VerificationStatus'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { Loader2, Info, Server, AlertTriangle } from 'lucide-react'
import type { ServerInfo } from '@/services/verification/types'

interface VerificationServer {
  name: string
  ip: string
  port: number
  region?: string
}

type ErrorState =
  | { type: 'offline'; servers: VerificationServer[] }
  | { type: 'wrong_server'; playerServer: ServerInfo; servers: VerificationServer[] }
  | { type: 'generic'; message: string }
  | null

export default function VerifyPage() {
  const t = useTranslations('auth.verification')
  const tAuth = useTranslations('auth')
  const router = useRouter()

  const [isStarting, setIsStarting] = useState(false)
  const [requestId, setRequestId] = useState<string | null>(null)
  const [errorState, setErrorState] = useState<ErrorState>(null)
  const [servers, setServers] = useState<VerificationServer[]>([])

  useEffect(() => {
    fetch('/api/verification/servers')
      .then((r) => r.json())
      .then((data) => setServers(data.servers || []))
      .catch(() => {})
  }, [])

  async function startVerification() {
    setIsStarting(true)
    setErrorState(null)

    try {
      const response = await fetch('/api/verification/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })

      const data = await response.json()

      if (!response.ok) {
        if (data.error === 'offline') {
          setErrorState({
            type: 'offline',
            servers: data.verificationServers || [],
          })
          return
        }

        if (data.error === 'wrong_server') {
          setErrorState({
            type: 'wrong_server',
            playerServer: data.playerServer,
            servers: data.verificationServers || [],
          })
          return
        }

        throw new Error(data.error || t('startError'))
      }

      setRequestId(data.requestId)
    } catch (error) {
      setErrorState({
        type: 'generic',
        message: error instanceof Error ? error.message : t('startError'),
      })
    } finally {
      setIsStarting(false)
    }
  }

  function handleSuccess() {
    toast.success(t('success'))
    setTimeout(() => {
      router.push('/app')
    }, 2000)
  }

  function handleRetry() {
    setRequestId(null)
    setErrorState(null)
  }

  // Active verification — show polling status
  if (requestId) {
    return (
      <AuthCard title={t('title')} description={t('description')}>
        <VerificationStatus requestId={requestId} onSuccess={handleSuccess} onRetry={handleRetry} />
      </AuthCard>
    )
  }

  return (
    <AuthCard title={t('title')} description={t('description')}>
      <div className="space-y-6">
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>{t('howItWorks')}</AlertDescription>
        </Alert>

        {/* Server list — always visible */}
        {servers.length > 0 && (
          <div className="p-3 rounded-lg bg-muted/50 border space-y-1.5">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              {t('joinServerFirst')}
            </p>
            <ServerList servers={servers} />
          </div>
        )}

        {/* Error: player offline */}
        {errorState?.type === 'offline' && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{t('errorOffline')}</AlertDescription>
          </Alert>
        )}

        {/* Error: wrong server */}
        {errorState?.type === 'wrong_server' && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <p className="font-medium mb-1">{t('errorWrongServer')}</p>
              <p className="text-sm">
                {t('youAreOn')}:{' '}
                <span className="font-mono">
                  {errorState.playerServer.ip}:{errorState.playerServer.port}
                </span>
              </p>
            </AlertDescription>
          </Alert>
        )}

        {/* Error: generic */}
        {errorState?.type === 'generic' && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{errorState.message}</AlertDescription>
          </Alert>
        )}

        <Button onClick={startVerification} className="w-full" disabled={isStarting}>
          {isStarting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {t('verifyMe')}
        </Button>
      </div>
    </AuthCard>
  )
}

function ServerList({ servers }: { servers: VerificationServer[] }) {
  if (servers.length === 0) return null

  return (
    <div className="space-y-1.5">
      {servers.map((server, i) => (
        <div key={i} className="flex items-center gap-2 text-sm">
          <Server className="h-3.5 w-3.5 shrink-0" />
          <span className="font-medium">{server.name}</span>
          <span className="font-mono text-xs text-muted-foreground">
            {server.ip}:{server.port}
          </span>
          {server.region && (
            <Badge variant="outline" className="text-xs py-0">
              {server.region}
            </Badge>
          )}
        </div>
      ))}
    </div>
  )
}
