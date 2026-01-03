'use client'

import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { Loader2, CheckCircle2, XCircle, Clock, Search } from 'lucide-react'
import { POLLING_INTERVAL_MS, VERIFICATION_TTL_MS } from '@/lib/verification-constants'

interface VerificationStatusProps {
  requestId: string
  token: string
  onSuccess: () => void
  onCancel: () => void
}

type Status = 'pending' | 'active' | 'success' | 'failed' | 'expired'

const statusConfig = {
  pending: { icon: Search, color: 'bg-yellow-500', textColor: 'text-yellow-500' },
  active: { icon: CheckCircle2, color: 'bg-green-500', textColor: 'text-green-500' },
  success: { icon: CheckCircle2, color: 'bg-green-500', textColor: 'text-green-500' },
  failed: { icon: XCircle, color: 'bg-red-500', textColor: 'text-red-500' },
  expired: { icon: Clock, color: 'bg-gray-500', textColor: 'text-gray-500' },
}

export function VerificationStatus({
  requestId,
  token,
  onSuccess,
  onCancel,
}: VerificationStatusProps) {
  const t = useTranslations('auth.verification')
  const [status, setStatus] = useState<Status>('pending')
  const [currentServer, setCurrentServer] = useState<string | null>(null)
  const [inputToken, setInputToken] = useState('')
  const [isConfirming, setIsConfirming] = useState(false)
  const [timeLeft, setTimeLeft] = useState(VERIFICATION_TTL_MS / 1000) // 10 minutes in seconds

  // Poll for status
  useEffect(() => {
    if (status === 'success' || status === 'expired' || status === 'failed') return

    const pollStatus = async () => {
      try {
        const response = await fetch('/api/verification/status', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ requestId }),
        })
        const data = await response.json()
        setStatus(data.status)
        if (data.currentServer) setCurrentServer(data.currentServer)
      } catch (error) {
        console.error('Status poll error:', error)
      }
    }

    pollStatus()
    const interval = setInterval(pollStatus, POLLING_INTERVAL_MS)
    return () => clearInterval(interval)
  }, [requestId, status])

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

  const confirmToken = async () => {
    if (inputToken.length !== 6) return

    setIsConfirming(true)
    try {
      const response = await fetch('/api/verification/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId, token: inputToken }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || t('confirmError'))
      }

      setStatus('success')
      toast.success(t('success'))
      onSuccess()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t('confirmError'))
    } finally {
      setIsConfirming(false)
    }
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const StatusIcon = statusConfig[status].icon
  const isTerminal = ['success', 'failed', 'expired'].includes(status)

  return (
    <div className="space-y-6">
      {/* Token Display */}
      <div className="text-center">
        <p className="text-sm text-muted-foreground mb-2">{t('yourToken')}</p>
        <div className="text-4xl font-mono font-bold tracking-widest bg-muted px-4 py-3 rounded-lg inline-block">
          {token}
        </div>
        <p className="text-xs text-muted-foreground mt-2">{t('tokenInstruction')}</p>
      </div>

      {/* Status */}
      <div className="flex items-center justify-center gap-2">
        <StatusIcon
          className={`h-5 w-5 ${statusConfig[status].textColor} ${status === 'pending' ? 'animate-pulse' : ''}`}
        />
        <Badge variant="outline" className={statusConfig[status].textColor}>
          {t(`status${status.charAt(0).toUpperCase() + status.slice(1)}`)}
        </Badge>
      </div>

      {currentServer && (
        <p className="text-center text-sm">
          {t('foundOnServer')}: <strong className="font-mono">{currentServer}</strong>
        </p>
      )}

      {/* Timer */}
      {!isTerminal && (
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>{t('timeRemaining')}</span>
            <span className="font-mono">{formatTime(timeLeft)}</span>
          </div>
          <Progress value={(timeLeft / (VERIFICATION_TTL_MS / 1000)) * 100} />
        </div>
      )}

      {/* Token Input (when active) */}
      {status === 'active' && (
        <div className="space-y-4">
          <p className="text-center text-sm">{t('enterReceivedToken')}</p>
          <div className="flex justify-center">
            <InputOTP value={inputToken} onChange={setInputToken} maxLength={6}>
              <InputOTPGroup>
                {[0, 1, 2, 3, 4, 5].map((index) => (
                  <InputOTPSlot key={index} index={index} />
                ))}
              </InputOTPGroup>
            </InputOTP>
          </div>
          <Button
            onClick={confirmToken}
            className="w-full"
            disabled={inputToken.length !== 6 || isConfirming}
          >
            {isConfirming && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {t('confirm')}
          </Button>
        </div>
      )}

      {/* Success message */}
      {status === 'success' && (
        <div className="text-center text-green-500">
          <CheckCircle2 className="h-12 w-12 mx-auto mb-2" />
          <p className="font-medium">{t('success')}</p>
        </div>
      )}

      {/* Failed/Expired message */}
      {(status === 'failed' || status === 'expired') && (
        <div className="text-center text-muted-foreground">
          <p>{status === 'failed' ? t('failedMessage') : t('expiredMessage')}</p>
        </div>
      )}

      {/* Cancel */}
      {!isTerminal && (
        <Button variant="outline" onClick={onCancel} className="w-full">
          {t('cancel')}
        </Button>
      )}

      {/* Retry for failed/expired */}
      {(status === 'failed' || status === 'expired') && (
        <Button onClick={onCancel} className="w-full">
          {t('tryAgain')}
        </Button>
      )}
    </div>
  )
}
