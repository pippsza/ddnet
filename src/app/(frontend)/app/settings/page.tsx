'use client'

import { useState, useEffect, useCallback } from 'react'
import useSWR from 'swr'
import { useTranslations, useLocale } from 'next-intl'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { TeeAvatarWithFallback, getDDNetSkinUrl } from '@/components/tee/TeeAvatar'
import { OnlineStatusIndicator } from '@/components/tee/OnlineStatusIndicator'
import { RoleBadge } from '@/components/ui/status-badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  Loader2,
  Wrench,
  Check,
  Sun,
  Moon,
  Globe,
} from 'lucide-react'
import { useBotSettings } from '@/hooks/use-bot-settings'
import { useTheme } from 'next-themes'
import { themes } from '@/lib/themes'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { setUserLocale } from '@/services/locale'
import type { Locale } from '@/i18n/config'
import {
  StepIndicator,
  StepConnector,
  ServerListItem,
  Spinner,
  type VerificationServer,
} from '@/components/auth/VerificationShared'
import { PageTransition, ScaleIn, FadeIn } from '@/components/ui/animations'

const fetcher = (url: string) => fetch(url).then((r) => r.json())

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

const availableLocales = [
  { code: 'en', name: 'English' },
  { code: 'ru', name: 'Русский' },
  { code: 'uk', name: 'Українська' },
  { code: 'de', name: 'Deutsch' },
  { code: 'tr', name: 'Türkçe' },
  { code: 'zh', name: '中文' },
] as const

type VerificationStep = 'idle' | 'starting' | 'pending' | 'success' | 'failed' | 'expired'

export default function SettingsPage() {
  const t = useTranslations('settings')
  const currentLocale = useLocale()
  const router = useRouter()
  const { data: user, mutate } = useSWR('/api/users/me', fetcher)
  const { data: serversData } = useSWR<{ servers: VerificationServer[] }>(
    '/api/verification/servers',
    fetcher,
  )
  const [message, setMessage] = useState('')
  const [pushSupported, setPushSupported] = useState(false)
  const [pushSubscribed, setPushSubscribed] = useState(false)
  const [pushLoading, setPushLoading] = useState(false)

  // Verification state
  const [verifyStep, setVerifyStep] = useState<VerificationStep>('idle')
  const [requestId, setRequestId] = useState<string | null>(null)
  const [currentServer, setCurrentServer] = useState<string | null>(null)
  const [verifyError, setVerifyError] = useState<string | null>(null)
  const [verifyMessage, setVerifyMessage] = useState<string | null>(null)

  const { botSettings } = useBotSettings()
  const servers = serversData?.servers || []
  const { theme: currentTheme, setTheme } = useTheme()
  const [themeMounted, setThemeMounted] = useState(false)
  useEffect(() => setThemeMounted(true), [])

  useEffect(() => {
    if ('serviceWorker' in navigator && 'PushManager' in window) {
      setPushSupported(true)
      navigator.serviceWorker.ready.then((reg) => {
        reg.pushManager.getSubscription().then((sub) => {
          setPushSubscribed(!!sub)
        })
      })
    }
  }, [])

  // Poll verification status
  useEffect(() => {
    if (!requestId || verifyStep !== 'pending') return

    const interval = setInterval(async () => {
      try {
        const res = await fetch('/api/verification/status', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ requestId }),
        })
        const data = await res.json()

        if (data.status === 'expired') {
          setVerifyStep('expired')
          setVerifyError(t('verification.errors.expired'))
          clearInterval(interval)
        } else if (data.status === 'failed') {
          setVerifyStep('failed')
          setVerifyMessage(data.message || null)
          if (data.message === 'not_logged_in') {
            setVerifyError(t('verification.errors.notLoggedIn'))
          } else if (data.message === 'not_found') {
            setVerifyError(t('verification.errors.notFound'))
          } else {
            setVerifyError(t('verification.errors.generic'))
          }
          setCurrentServer(data.currentServer || null)
          clearInterval(interval)
        } else if (data.status === 'success') {
          setVerifyStep('success')
          setCurrentServer(data.currentServer || null)
          mutate()
          clearInterval(interval)
        }
      } catch {
        // Ignore polling errors, will retry
      }
    }, 3000)

    return () => clearInterval(interval)
  }, [requestId, verifyStep, mutate, t])

  const handlePushToggle = async () => {
    if (!pushSupported || pushLoading) return
    setPushLoading(true)
    setMessage('')
    try {
      // 1. Check SW registration
      const registrations = await navigator.serviceWorker.getRegistrations()
      console.log(
        '[Push] SW registrations:',
        registrations.length,
        registrations.map((r) => r.scope),
      )

      if (registrations.length === 0) {
        console.log('[Push] No SW registered, registering now...')
        await navigator.serviceWorker.register('/sw.js')
      }

      const reg = await navigator.serviceWorker.ready
      console.log('[Push] SW ready, scope:', reg.scope, 'active:', !!reg.active)

      if (pushSubscribed) {
        const sub = await reg.pushManager.getSubscription()
        if (sub) await sub.unsubscribe()
        setPushSubscribed(false)
        return
      }

      // 2. Check permission
      const permission = await Notification.requestPermission()
      console.log('[Push] Permission:', permission)
      if (permission !== 'granted') {
        setMessage(t('pushNotifications.errors.permissionDenied'))
        return
      }

      // 3. Get VAPID key
      const keyRes = await fetch('/api/push/subscribe')
      const keyData = await keyRes.json()
      console.log(
        '[Push] VAPID key response:',
        keyRes.status,
        'key length:',
        keyData.vapidPublicKey?.length,
      )

      if (!keyData.vapidPublicKey) {
        setMessage(t('pushNotifications.errors.notConfigured'))
        return
      }

      // 4. Subscribe
      const convertedKey = urlBase64ToUint8Array(keyData.vapidPublicKey)
      console.log(
        '[Push] Subscribing with key (converted to Uint8Array, length:',
        convertedKey.length,
        ')',
      )
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: convertedKey,
      })
      console.log('[Push] Subscribed, endpoint:', sub.endpoint.slice(0, 60) + '...')

      // 5. Save to server
      const saveRes = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sub.toJSON()),
      })
      console.log('[Push] Save response:', saveRes.status)

      setPushSubscribed(true)
    } catch (err) {
      console.error('[Settings] Push toggle error:', err)
      const msg = err instanceof Error ? err.message : String(err)
      if (msg.includes('push service')) {
        setMessage(t('pushNotifications.errors.serviceUnavailable'))
      } else {
        setMessage(t('pushNotifications.errors.generic', { message: msg }))
      }
    } finally {
      setPushLoading(false)
    }
  }

  const startVerification = useCallback(async () => {
    setVerifyStep('starting')
    setVerifyError(null)
    setVerifyMessage(null)
    setCurrentServer(null)
    try {
      const res = await fetch('/api/verification/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
      const data = await res.json()

      if (!res.ok) {
        if (data.error === 'offline') {
          throw new Error(t('verification.errors.offline'))
        }
        if (data.error === 'wrong_server') {
          const serverList = (data.verificationServers || [])
            .map((s: { name: string; ip: string; port: number }) => `${s.name} (${s.ip}:${s.port})`)
            .join(', ')
          throw new Error(t('verification.errors.wrongServer', { servers: serverList }))
        }
        throw new Error(data.error || t('verification.errors.startFailed'))
      }

      setRequestId(data.requestId)
      setVerifyStep('pending')
    } catch (err: unknown) {
      setVerifyStep('failed')
      setVerifyError(err instanceof Error ? err.message : t('verification.errors.startFailed'))
    }
  }, [t])

  const resetVerification = () => {
    setVerifyStep('idle')
    setRequestId(null)
    setCurrentServer(null)
    setVerifyError(null)
    setVerifyMessage(null)
  }

  const handleLocaleChange = async (newLocale: string) => {
    await setUserLocale(newLocale as Locale)
    router.refresh()
  }

  const isLoading = !user

  const skinUrl = user?.user?.ingameStats?.skin?.name
    ? getDDNetSkinUrl(user.user.ingameStats.skin.name)
    : undefined

  const isVerified = user?.user?.isSystemVerified

  // Step progress for the 3 circles
  const step1Complete = verifyStep === 'pending' || verifyStep === 'success'
  const step1Active = verifyStep === 'starting'
  const step2Complete = verifyStep === 'pending' || verifyStep === 'success'
  const step3Complete = verifyStep === 'success'
  const step3Active = verifyStep === 'pending'

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">{t('title')}</h1>

      {/* Profile Card */}
      <Card>
        <CardHeader>
          <CardTitle>{t('profile.title')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoading ? (
            <>
              <div className="flex items-center gap-4">
                <Skeleton className="h-16 w-16 rounded-full" />
                <div className="space-y-2">
                  <Skeleton className="h-5 w-32" />
                  <Skeleton className="h-5 w-16 rounded-full" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-9 w-full rounded-md" />
                </div>
                <div className="space-y-2">
                  <Skeleton className="h-4 w-28" />
                  <Skeleton className="h-9 w-full rounded-md" />
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center gap-4">
                <OnlineStatusIndicator
                  status={{ platformOnline: true, inGameOnline: false }}
                  size="lg"
                >
                  <TeeAvatarWithFallback
                    skinUrl={skinUrl}
                    bodyColor={user?.user?.ingameStats?.skin?.colorBody}
                    feetColor={user?.user?.ingameStats?.skin?.colorFeet}
                    size="lg"
                    useCustomColors={
                      !!(
                        user?.user?.ingameStats?.skin?.colorBody ||
                        user?.user?.ingameStats?.skin?.colorFeet
                      )
                    }
                  />
                </OnlineStatusIndicator>
                <div>
                  <p className="text-lg font-semibold">{user?.user?.ingameNick}</p>
                  <RoleBadge role={(user?.user as any)?.primaryRole || user?.user?.roles} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>{t('profile.platformLogin')}</Label>
                  <Input value={user?.user?.username || ''} disabled />
                </div>
                <div>
                  <Label>{t('profile.inGameNickname')}</Label>
                  <Input value={user?.user?.ingameNick || ''} disabled />
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Theme Card */}
      <Card>
        <CardHeader>
          <CardTitle>{t('theme.title')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
            {themes.map((themeItem) => {
              const isSelected = themeMounted && currentTheme === themeItem.id
              const isDark = themeItem.mode === 'dark'
              return (
                <button
                  key={themeItem.id}
                  onClick={() => setTheme(themeItem.id)}
                  className={`group relative rounded-lg border-2 p-2 text-left transition-all hover:scale-[1.02] ${
                    isSelected
                      ? 'border-primary ring-2 ring-primary/20'
                      : 'border-border hover:border-muted-foreground/30'
                  }`}
                >
                  {/* Mini preview */}
                  <div
                    className="rounded-md p-2.5 space-y-1.5 mb-2"
                    style={{
                      background: themeItem.preview.background,
                      borderColor: themeItem.preview.border,
                      borderWidth: '1px',
                      borderStyle: 'solid',
                    }}
                  >
                    {/* Header bar */}
                    <div className="flex items-center gap-1.5">
                      <div
                        className="w-5 h-5 rounded-full flex items-center justify-center"
                        style={{ background: themeItem.preview.primary }}
                      >
                        {isDark ? (
                          <Moon
                            className="w-3 h-3"
                            style={{ color: themeItem.preview.background }}
                          />
                        ) : (
                          <Sun
                            className="w-3 h-3"
                            style={{ color: themeItem.preview.background }}
                          />
                        )}
                      </div>
                      <div
                        className="h-2 flex-1 rounded-full"
                        style={{ background: themeItem.preview.muted }}
                      />
                    </div>
                    {/* Card preview */}
                    <div
                      className="rounded p-1.5 space-y-1"
                      style={{
                        background: themeItem.preview.card,
                        borderColor: themeItem.preview.border,
                        borderWidth: '1px',
                        borderStyle: 'solid',
                      }}
                    >
                      <div
                        className="h-1.5 w-3/4 rounded-full"
                        style={{ background: themeItem.preview.foreground, opacity: 0.7 }}
                      />
                      <div
                        className="h-1.5 w-1/2 rounded-full"
                        style={{ background: themeItem.preview.muted }}
                      />
                      <div
                        className="h-1.5 w-1/3 rounded-full"
                        style={{ background: themeItem.preview.primary }}
                      />
                    </div>
                  </div>
                  {/* Label */}
                  <p
                    className={`text-xs font-medium text-center truncate ${
                      isSelected ? 'text-primary' : 'text-muted-foreground'
                    }`}
                  >
                    {themeItem.name}
                  </p>
                  {/* Selected indicator */}
                  {isSelected && (
                    <div className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-primary flex items-center justify-center">
                      <Check className="w-2.5 h-2.5 text-primary-foreground" />
                    </div>
                  )}
                </button>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Language Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            {t('language.title')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">{t('language.description')}</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {availableLocales.map((locale) => {
              const isSelected = currentLocale === locale.code
              return (
                <button
                  key={locale.code}
                  onClick={() => handleLocaleChange(locale.code)}
                  className={`relative rounded-lg border-2 p-3 text-center transition-all hover:scale-[1.02] ${
                    isSelected
                      ? 'border-primary ring-2 ring-primary/20'
                      : 'border-border hover:border-muted-foreground/30'
                  }`}
                >
                  <p
                    className={`text-sm font-medium ${
                      isSelected ? 'text-primary' : 'text-foreground'
                    }`}
                  >
                    {locale.name}
                  </p>
                  {isSelected && (
                    <div className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-primary flex items-center justify-center">
                      <Check className="w-2.5 h-2.5 text-primary-foreground" />
                    </div>
                  )}
                </button>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Verification Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {t('verification.title')}
            {isLoading ? (
              <Skeleton className="h-5 w-20 rounded-full" />
            ) : isVerified ? (
              <Badge variant="default" className="bg-green-600">
                <ShieldCheck className="h-3 w-3 mr-1" />
                {t('verification.verified')}
              </Badge>
            ) : null}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center gap-3 p-4 rounded-lg bg-muted/50">
              <Skeleton className="h-10 w-10 rounded-full shrink-0" />
              <div className="space-y-2 flex-1">
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-3 w-64" />
              </div>
            </div>
          ) : isVerified ? (
            <div className="flex items-center gap-3 p-4 rounded-lg bg-green-500/10 border border-green-500/20">
              <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center shrink-0">
                <ShieldCheck className="w-5 h-5 text-green-500" />
              </div>
              <div>
                <p className="font-medium text-green-700 dark:text-green-400">
                  {t('verification.accountVerified')}
                </p>
                <p className="text-sm text-muted-foreground">{t('verification.fullAccess')}</p>
              </div>
            </div>
          ) : !botSettings.verificationBotEnabled ? (
            <div className="space-y-4">
              <div className="flex items-start gap-3 p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
                <Wrench className="h-5 w-5 shrink-0 mt-0.5 text-yellow-500" />
                <div>
                  <p className="text-sm font-medium text-yellow-700 dark:text-yellow-400">
                    {t('verification.unavailableTitle')}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {t('verification.unavailableDescription')}{' '}
                    <Link href="/support" className="text-primary hover:underline">
                      {t('verification.supportTicket')}
                    </Link>
                    .
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* 3-Step Progress */}
              {verifyStep !== 'idle' && (
                <div className="flex items-start px-4">
                  <StepIndicator
                    step={1}
                    label={t('verification.step1Label')}
                    description={t('verification.step1Description')}
                    active={step1Active}
                    completed={step1Complete}
                  />
                  <StepConnector completed={step1Complete && step2Complete} />
                  <StepIndicator
                    step={2}
                    label={t('verification.step2Label')}
                    description={t('verification.step2Description')}
                    active={false}
                    completed={step2Complete}
                  />
                  <StepConnector completed={step3Complete} />
                  <StepIndicator
                    step={3}
                    label={t('verification.step3Label')}
                    description={t('verification.step3Description')}
                    active={step3Active}
                    completed={step3Complete}
                  />
                </div>
              )}

              {verifyStep === 'idle' && (
                <p className="text-sm text-muted-foreground">{t('verification.description')}</p>
              )}

              {/* Server List */}
              {(verifyStep === 'idle' || verifyStep === 'failed' || verifyStep === 'expired') &&
                servers.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      {t('verification.serversLabel')}
                    </p>
                    <div className="space-y-1.5">
                      {servers.map((s, i) => (
                        <ServerListItem key={i} server={s} />
                      ))}
                    </div>
                  </div>
                )}

              {verifyStep === 'idle' && (
                <Button onClick={startVerification} className="w-full sm:w-auto">
                  <ShieldCheck className="h-4 w-4 mr-2" />
                  {t('verification.verifyButton')}
                </Button>
              )}

              {verifyStep === 'starting' && (
                <div className="flex items-center gap-3 p-4 rounded-lg bg-muted">
                  <Spinner />
                  <p className="text-sm">{t('verification.starting')}</p>
                </div>
              )}

              {verifyStep === 'pending' && (
                <div className="space-y-4">
                  <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/20 space-y-3">
                    <div className="flex items-center gap-3">
                      <Spinner className="text-blue-500" />
                      <div>
                        <p className="font-medium text-blue-700 dark:text-blue-400">
                          {t('verification.verifying')}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {t('verification.verifyingDescription')}
                        </p>
                      </div>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" onClick={resetVerification}>
                    {t('verification.cancelButton')}
                  </Button>
                </div>
              )}

              {verifyStep === 'success' && (
                <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/20">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center shrink-0">
                      <ShieldCheck className="w-5 h-5 text-green-500" />
                    </div>
                    <div>
                      <p className="font-medium text-green-700 dark:text-green-400">
                        {t('verification.successTitle')}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {t('verification.successDescription')}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {(verifyStep === 'failed' || verifyStep === 'expired') && (
                <div className="space-y-3">
                  <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center shrink-0">
                        <ShieldAlert className="w-5 h-5 text-red-500" />
                      </div>
                      <div>
                        <p className="font-medium text-red-700 dark:text-red-400">
                          {verifyStep === 'expired'
                            ? t('verification.expiredTitle')
                            : t('verification.failedTitle')}
                        </p>
                        <p className="text-sm text-muted-foreground">{verifyError}</p>
                      </div>
                    </div>
                  </div>
                  <Button onClick={resetVerification} variant="outline">
                    {t('verification.tryAgain')}
                  </Button>
                </div>
              )}

              {/* Warning for unverified accounts */}
              <div className="flex items-start gap-3 p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
                <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5 text-yellow-500" />
                <div>
                  <p className="text-sm font-medium text-yellow-700 dark:text-yellow-400">
                    {t('verification.unverifiedTitle')}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {t('verification.unverifiedWarning')}
                  </p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Notifications Card */}
      <Card>
        <CardHeader>
          <CardTitle>{t('pushNotifications.title')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {pushSupported ? (
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">{t('pushNotifications.label')}</p>
                <p className="text-sm text-muted-foreground">
                  {t('pushNotifications.description')}
                </p>
              </div>
              <Button
                variant={pushSubscribed ? 'secondary' : 'default'}
                onClick={handlePushToggle}
                disabled={pushLoading}
              >
                {pushLoading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                {pushSubscribed ? t('pushNotifications.disable') : t('pushNotifications.enable')}
              </Button>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">{t('pushNotifications.notSupported')}</p>
          )}
        </CardContent>
      </Card>

      {message && <p className="text-sm text-muted-foreground text-center">{message}</p>}
    </div>
  )
}
