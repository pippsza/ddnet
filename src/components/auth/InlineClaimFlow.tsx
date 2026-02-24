'use client'

import { useState, useEffect, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { ShieldCheck, ShieldAlert, ArrowLeft } from 'lucide-react'
import {
  StepIndicator,
  StepConnector,
  ServerListItem,
  Spinner,
  type VerificationServer,
} from '@/components/auth/VerificationShared'

type ClaimStep = 'servers' | 'verifying' | 'success' | 'failed' | 'expired'

interface InlineClaimFlowProps {
  ingameNick: string
  onBack: () => void
  onClaimSuccess: (claimId: string) => void
}

export function InlineClaimFlow({ ingameNick, onBack, onClaimSuccess }: InlineClaimFlowProps) {
  const t = useTranslations('auth')
  const [claimStep, setClaimStep] = useState<ClaimStep>('servers')
  const [claimId, setClaimId] = useState<string | null>(null)
  const [servers, setServers] = useState<VerificationServer[]>([])
  const [error, setError] = useState<string | null>(null)
  const [starting, setStarting] = useState(false)

  useEffect(() => {
    fetch('/api/verification/servers')
      .then((r) => r.json())
      .then((data) => setServers(data.servers || []))
      .catch(() => {})
  }, [])

  const handleStartClaim = useCallback(async () => {
    setStarting(true)
    setError(null)

    try {
      const res = await fetch('/api/verification/claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ingameNick }),
      })
      const data = await res.json()

      if (!res.ok) {
        if (data.error === 'offline') {
          setError(t('notOnlineError'))
          return
        }
        if (data.error === 'wrong_server') {
          setError(t('wrongServerError'))
          return
        }
        if (data.error === 'no_account') {
          onBack()
          return
        }
        if (data.error === 'already_verified') {
          setError(data.message || 'This account is already verified by its owner.')
          return
        }
        setError(data.error || data.message || t('claimFailed'))
        return
      }

      setClaimId(data.claimId)
      setClaimStep('verifying')
    } catch {
      setError(t('claimFailed'))
    } finally {
      setStarting(false)
    }
  }, [ingameNick, t, onBack])

  // Poll claim status
  useEffect(() => {
    if (!claimId || claimStep !== 'verifying') return

    const interval = setInterval(async () => {
      try {
        const res = await fetch('/api/verification/claim/status', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ claimId }),
        })
        const data = await res.json()

        if (data.status === 'expired') {
          setClaimStep('expired')
          setError(t('claimExpired'))
          clearInterval(interval)
        } else if (data.status === 'failed') {
          setClaimStep('failed')
          if (data.message === 'not_logged_in') {
            setError(t('verification.failedNotLoggedIn'))
          } else if (data.message === 'not_found') {
            setError(t('verification.failedNotFound'))
          } else {
            setError(t('claimFailed'))
          }
          clearInterval(interval)
        } else if (data.status === 'success') {
          setClaimStep('success')
          onClaimSuccess(claimId)
          clearInterval(interval)
        }
      } catch {
        // Ignore polling errors
      }
    }, 3000)

    return () => clearInterval(interval)
  }, [claimId, claimStep, t, onClaimSuccess])

  const resetToServers = () => {
    setClaimStep('servers')
    setClaimId(null)
    setError(null)
    setStarting(false)
  }

  // Step progress
  const step1Complete = claimStep === 'verifying' || claimStep === 'success'
  const step1Active = claimStep === 'servers'
  const step2Complete = claimStep === 'verifying' || claimStep === 'success'
  const step2Active = claimStep === 'servers'
  const step3Complete = claimStep === 'success'
  const step3Active = claimStep === 'verifying'

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h3 className="text-lg font-semibold">{t('claimTitle')}</h3>
          <p className="text-sm text-muted-foreground">
            {t('claimNickname', { nick: ingameNick })}
          </p>
        </div>
      </div>

      {/* Progress Steps */}
      <div className="flex items-start px-2">
        <StepIndicator
          step={1}
          label={t('verification.joinServerFirst').split(':')[0] || 'Join Server'}
          description={t('verification.server')}
          active={step1Active}
          completed={step1Complete}
        />
        <StepConnector completed={step2Complete} />
        <StepIndicator
          step={2}
          label="Login"
          description="/login"
          active={step2Active && !step1Active}
          completed={step2Complete}
        />
        <StepConnector completed={step3Complete} />
        <StepIndicator
          step={3}
          label={t('verification.verifyMe')}
          description={t('verification.botChecking').split('.')[0]}
          active={step3Active}
          completed={step3Complete}
        />
      </div>

      {/* Servers step */}
      {claimStep === 'servers' && (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            {t('joinServerDescription')}
          </p>

          {error && (
            <div className="flex items-start gap-3 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
              <ShieldAlert className="h-4 w-4 shrink-0 mt-0.5 text-yellow-500" />
              <p className="text-sm text-muted-foreground">{error}</p>
            </div>
          )}

          {servers.length > 0 && (
            <div className="space-y-1.5">
              {servers.map((s, i) => (
                <ServerListItem key={i} server={s} />
              ))}
            </div>
          )}

          <Button onClick={handleStartClaim} disabled={starting} className="w-full">
            {starting ? (
              <>
                <Spinner className="mr-2" />
                {t('verification.statusPending')}
              </>
            ) : (
              <>
                <ShieldCheck className="h-4 w-4 mr-2" />
                {t('verifyClaim')}
              </>
            )}
          </Button>
        </div>
      )}

      {/* Verifying step */}
      {claimStep === 'verifying' && (
        <div className="space-y-4">
          <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/20">
            <div className="flex items-center gap-3">
              <Spinner className="text-blue-500" />
              <div>
                <p className="font-medium text-blue-700 dark:text-blue-400">
                  {t('verifyingIdentity')}
                </p>
                <p className="text-sm text-muted-foreground">
                  {t('botCheckingClaim')}
                </p>
              </div>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={onBack}>
            {t('verification.cancel')}
          </Button>
        </div>
      )}

      {/* Success — auto-transitions to claim-register form */}
      {claimStep === 'success' && (
        <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-5 h-5 text-green-500" />
            </div>
            <div>
              <p className="font-medium text-green-700 dark:text-green-400">
                {t('claimSuccess')}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Failed / Expired */}
      {(claimStep === 'failed' || claimStep === 'expired') && (
        <div className="space-y-3">
          <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center shrink-0">
                <ShieldAlert className="w-5 h-5 text-red-500" />
              </div>
              <div>
                <p className="font-medium text-red-700 dark:text-red-400">
                  {claimStep === 'expired' ? t('verification.statusExpired') : t('verification.statusFailed')}
                </p>
                <p className="text-sm text-muted-foreground">{error}</p>
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <Button onClick={resetToServers}>
              {t('verification.tryAgain')}
            </Button>
            <Button variant="outline" onClick={onBack}>
              {t('backToRegister')}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
