'use client'

import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { Loader2, CheckCircle2, XCircle, Clock, RefreshCw } from 'lucide-react'
import { POLLING_INTERVAL_MS, VERIFICATION_TTL_MS } from '@/lib/verification-constants'

interface VerificationStatusProps {
  requestId: string
  onSuccess: () => void
  onRetry: () => void
}

type Status = 'pending' | 'success' | 'failed' | 'expired'

export function VerificationStatus({ requestId, onSuccess, onRetry }: VerificationStatusProps) {
  const t = useTranslations('auth.verification')
  const [status, setStatus] = useState<Status>('pending')
  const [message, setMessage] = useState<string | null>(null)
  const [currentServer, setCurrentServer] = useState<string | null>(null)
  const [timeLeft, setTimeLeft] = useState(VERIFICATION_TTL_MS / 1000)

  // Poll for status
  useEffect(() => {
    if (status === 'success' || status === 'expired') return

    const pollStatus = async () => {
      try {
        const response = await fetch('/api/verification/status', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ requestId }),
        })
        const data = await response.json()

        setStatus(data.status)
        if (data.message) setMessage(data.message)
        if (data.currentServer) setCurrentServer(data.currentServer)

        if (data.status === 'success') {
          onSuccess()
        }
      } catch (error) {
        console.error('Status poll error:', error)
      }
    }

    pollStatus()
    const interval = setInterval(pollStatus, POLLING_INTERVAL_MS)
    return () => clearInterval(interval)
  }, [requestId, status, onSuccess])

  // Countdown timer
  useEffect(() => {
    if (timeLeft <= 0 || status === 'success') {
      if (timeLeft <= 0 && status !== 'expired') {
        setStatus('expired')
      }
      return
    }
    const timer = setInterval(() => setTimeLeft((t) => t - 1), 1000)
    return () => clearInterval(timer)
  }, [timeLeft, status])

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const isTerminal = ['success', 'failed', 'expired'].includes(status)

  // Pending — bot is checking
  if (status === 'pending') {
    return (
      <div className="space-y-6">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-yellow-500" />
          <Badge variant="outline" className="text-yellow-500">
            {t('statusPending')}
          </Badge>
          <p className="text-sm text-muted-foreground text-center">{t('botChecking')}</p>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>{t('timeRemaining')}</span>
            <span className="font-mono">{formatTime(timeLeft)}</span>
          </div>
          <Progress value={(timeLeft / (VERIFICATION_TTL_MS / 1000)) * 100} />
        </div>

        <Button variant="outline" onClick={onRetry} className="w-full">
          {t('cancel')}
        </Button>
      </div>
    )
  }

  // Success
  if (status === 'success') {
    return (
      <div className="space-y-4">
        <div className="flex flex-col items-center gap-3">
          <CheckCircle2 className="h-12 w-12 text-green-500" />
          <p className="font-medium text-green-500">{t('success')}</p>
          {currentServer && (
            <p className="text-sm text-muted-foreground">
              {t('verifiedOnServer')}: <strong className="font-mono">{currentServer}</strong>
            </p>
          )}
        </div>
      </div>
    )
  }

  // Failed
  if (status === 'failed') {
    let failMessage: string
    switch (message) {
      case 'not_logged_in':
        failMessage = t('failedNotLoggedIn')
        break
      case 'not_found':
        failMessage = t('failedNotFound')
        break
      default:
        failMessage = t('failedGeneric')
    }

    return (
      <div className="space-y-4">
        <div className="flex flex-col items-center gap-3">
          <XCircle className="h-12 w-12 text-red-500" />
          <Badge variant="outline" className="text-red-500">
            {t('statusFailed')}
          </Badge>
          <p className="text-sm text-center text-muted-foreground">{failMessage}</p>
          {currentServer && (
            <p className="text-xs text-muted-foreground">
              {t('server')}: <span className="font-mono">{currentServer}</span>
            </p>
          )}
        </div>
        <Button onClick={onRetry} className="w-full">
          <RefreshCw className="mr-2 h-4 w-4" />
          {t('tryAgain')}
        </Button>
      </div>
    )
  }

  // Expired
  return (
    <div className="space-y-4">
      <div className="flex flex-col items-center gap-3">
        <Clock className="h-12 w-12 text-muted-foreground" />
        <Badge variant="outline" className="text-muted-foreground">
          {t('statusExpired')}
        </Badge>
        <p className="text-sm text-center text-muted-foreground">{t('expiredMessage')}</p>
      </div>
      <Button onClick={onRetry} className="w-full">
        <RefreshCw className="mr-2 h-4 w-4" />
        {t('tryAgain')}
      </Button>
    </div>
  )
}
