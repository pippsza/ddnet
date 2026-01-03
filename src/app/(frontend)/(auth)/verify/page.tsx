'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { useRouter } from 'next/navigation'
import { AuthCard } from '@/components/auth/AuthCard'
import { VerificationStatus } from '@/components/auth/VerificationStatus'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { toast } from 'sonner'
import { Loader2, Info } from 'lucide-react'

export default function VerifyPage() {
  const t = useTranslations('auth.verification')
  const tAuth = useTranslations('auth')
  const router = useRouter()

  const [nickname, setNickname] = useState('')
  const [isStarting, setIsStarting] = useState(false)
  const [verificationData, setVerificationData] = useState<{
    requestId: string
    token: string
  } | null>(null)

  async function startVerification() {
    if (!nickname.trim() || nickname.length < 2 || nickname.length > 16) {
      toast.error(t('invalidNickname'))
      return
    }

    setIsStarting(true)
    try {
      const response = await fetch('/api/verification/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nickname: nickname.trim() }),
      })

      const data = await response.json()

      if (!response.ok) {
        // If there's already an active request, use it
        if (response.status === 409 && data.requestId) {
          setVerificationData({
            requestId: data.requestId,
            token: data.token,
          })
          return
        }
        throw new Error(data.error || t('startError'))
      }

      setVerificationData({
        requestId: data.requestId,
        token: data.token,
      })
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t('startError'))
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

  function handleCancel() {
    setVerificationData(null)
    setNickname('')
  }

  if (verificationData) {
    return (
      <AuthCard title={t('title')} description={t('description')}>
        <VerificationStatus
          requestId={verificationData.requestId}
          token={verificationData.token}
          onSuccess={handleSuccess}
          onCancel={handleCancel}
        />
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

        <div className="space-y-2">
          <Label htmlFor="nickname">{tAuth('nickname')}</Label>
          <Input
            id="nickname"
            placeholder="YourNickname"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            maxLength={16}
          />
          <p className="text-xs text-muted-foreground">{t('nicknameHelp')}</p>
        </div>

        <Button onClick={startVerification} className="w-full" disabled={isStarting}>
          {isStarting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {t('startButton')}
        </Button>
      </div>
    </AuthCard>
  )
}
