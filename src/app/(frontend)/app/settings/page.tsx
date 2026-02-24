'use client'

import { useState, useEffect, useCallback } from 'react'
import useSWR from 'swr'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { TeeAvatarWithFallback, getDDNetSkinUrl } from '@/components/tee/TeeAvatar'
import { OnlineStatusIndicator } from '@/components/tee/OnlineStatusIndicator'
import { RoleBadge } from '@/components/ui/status-badge'
import { Skeleton } from '@/components/ui/skeleton'
import { ShieldCheck, ShieldAlert, AlertTriangle, Loader2 } from 'lucide-react'
import {
  StepIndicator,
  StepConnector,
  ServerListItem,
  Spinner,
  type VerificationServer,
} from '@/components/auth/VerificationShared'

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

type VerificationStep = 'idle' | 'starting' | 'pending' | 'success' | 'failed' | 'expired'

export default function SettingsPage() {
  const { data: user, mutate } = useSWR('/api/users/me', fetcher)
  const { data: serversData } = useSWR<{ servers: VerificationServer[] }>('/api/verification/servers', fetcher)
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

  const servers = serversData?.servers || []

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
          setVerifyError('Verification request expired. Please try again.')
          clearInterval(interval)
        } else if (data.status === 'failed') {
          setVerifyStep('failed')
          setVerifyMessage(data.message || null)
          if (data.message === 'not_logged_in') {
            setVerifyError('You are not logged in on the server. Use /login to log in and try again.')
          } else if (data.message === 'not_found') {
            setVerifyError('Player not found on the server. Make sure you are connected.')
          } else {
            setVerifyError('Verification failed. Please try again.')
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
  }, [requestId, verifyStep, mutate])

  const handlePushToggle = async () => {
    if (!pushSupported || pushLoading) return
    setPushLoading(true)
    setMessage('')
    try {
      // 1. Check SW registration
      const registrations = await navigator.serviceWorker.getRegistrations()
      console.log('[Push] SW registrations:', registrations.length, registrations.map((r) => r.scope))

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
        setMessage('Notification permission denied')
        return
      }

      // 3. Get VAPID key
      const keyRes = await fetch('/api/push/subscribe')
      const keyData = await keyRes.json()
      console.log('[Push] VAPID key response:', keyRes.status, 'key length:', keyData.vapidPublicKey?.length)

      if (!keyData.vapidPublicKey) {
        setMessage('Push not configured on server (no VAPID key)')
        return
      }

      // 4. Subscribe
      const convertedKey = urlBase64ToUint8Array(keyData.vapidPublicKey)
      console.log('[Push] Subscribing with key (converted to Uint8Array, length:', convertedKey.length, ')')
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
        setMessage(
          'Push service unavailable. Check: 1) Internet connection 2) Browser push is enabled in settings 3) No firewall/VPN blocking push services. Try: chrome://settings/content/notifications or about:preferences#privacy',
        )
      } else {
        setMessage(`Push error: ${msg}`)
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
          throw new Error('You are not online. Please join a verification server first.')
        }
        if (data.error === 'wrong_server') {
          const serverList = (data.verificationServers || [])
            .map((s: { name: string; ip: string; port: number }) => `${s.name} (${s.ip}:${s.port})`)
            .join(', ')
          throw new Error(`You are on the wrong server. Please join: ${serverList}`)
        }
        throw new Error(data.error || 'Failed to start verification')
      }

      setRequestId(data.requestId)
      setVerifyStep('pending')
    } catch (err: unknown) {
      setVerifyStep('failed')
      setVerifyError(err instanceof Error ? err.message : 'Failed to start verification')
    }
  }, [])

  const resetVerification = () => {
    setVerifyStep('idle')
    setRequestId(null)
    setCurrentServer(null)
    setVerifyError(null)
    setVerifyMessage(null)
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
      <h1 className="text-2xl font-bold">Settings</h1>

      {/* Profile Card */}
      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
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
                <OnlineStatusIndicator status={{ platformOnline: true, inGameOnline: false }} size="lg">
                  <TeeAvatarWithFallback
                    skinUrl={skinUrl}
                    bodyColor={user?.user?.ingameStats?.skin?.colorBody}
                    feetColor={user?.user?.ingameStats?.skin?.colorFeet}
                    size="lg"
                    useCustomColors={!!(user?.user?.ingameStats?.skin?.colorBody || user?.user?.ingameStats?.skin?.colorFeet)}
                  />
                </OnlineStatusIndicator>
                <div>
                  <p className="text-lg font-semibold">{user?.user?.ingameNick || user?.user?.username}</p>
                  <RoleBadge role={(user?.user as any)?.primaryRole || user?.user?.roles} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Platform Login</Label>
                  <Input value={user?.user?.username || ''} disabled />
                </div>
                <div>
                  <Label>In-Game Nickname</Label>
                  <Input value={user?.user?.ingameNick || ''} disabled />
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Verification Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Account Verification
            {isLoading ? (
              <Skeleton className="h-5 w-20 rounded-full" />
            ) : isVerified ? (
              <Badge variant="default" className="bg-green-600">
                <ShieldCheck className="h-3 w-3 mr-1" />
                Verified
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
                <p className="font-medium text-green-700 dark:text-green-400">Your account is verified and protected</p>
                <p className="text-sm text-muted-foreground">You have full access to all features.</p>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* 3-Step Progress */}
              {verifyStep !== 'idle' && (
                <div className="flex items-start px-4">
                  <StepIndicator
                    step={1}
                    label="Join Server"
                    description="Connect to a verification server"
                    active={step1Active}
                    completed={step1Complete}
                  />
                  <StepConnector completed={step1Complete && step2Complete} />
                  <StepIndicator
                    step={2}
                    label="Login"
                    description="Use /login on the server"
                    active={false}
                    completed={step2Complete}
                  />
                  <StepConnector completed={step3Complete} />
                  <StepIndicator
                    step={3}
                    label="Verify"
                    description="Bot confirms your identity"
                    active={step3Active}
                    completed={step3Complete}
                  />
                </div>
              )}

              {verifyStep === 'idle' && (
                <p className="text-sm text-muted-foreground">
                  Verify your DDNet nickname to unlock all features. Join one of the servers below,
                  log in with <code className="text-xs bg-muted px-1.5 py-0.5 rounded font-mono">/login</code>, then click the button.
                </p>
              )}

              {/* Server List */}
              {(verifyStep === 'idle' || verifyStep === 'failed' || verifyStep === 'expired') && servers.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Verification Servers</p>
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
                  Verify Nickname
                </Button>
              )}

              {verifyStep === 'starting' && (
                <div className="flex items-center gap-3 p-4 rounded-lg bg-muted">
                  <Spinner />
                  <p className="text-sm">Starting verification...</p>
                </div>
              )}

              {verifyStep === 'pending' && (
                <div className="space-y-4">
                  <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/20 space-y-3">
                    <div className="flex items-center gap-3">
                      <Spinner className="text-blue-500" />
                      <div>
                        <p className="font-medium text-blue-700 dark:text-blue-400">
                          Verifying your identity...
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Bot is checking your account on the server. This usually takes a few seconds.
                        </p>
                      </div>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" onClick={resetVerification}>
                    Cancel
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
                      <p className="font-medium text-green-700 dark:text-green-400">Verification successful!</p>
                      <p className="text-sm text-muted-foreground">Your nickname has been verified. Welcome!</p>
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
                          {verifyStep === 'expired' ? 'Verification Expired' : 'Verification Failed'}
                        </p>
                        <p className="text-sm text-muted-foreground">{verifyError}</p>
                      </div>
                    </div>
                  </div>
                  <Button onClick={resetVerification} variant="outline">
                    Try Again
                  </Button>
                </div>
              )}

              {/* Warning for unverified accounts */}
              <div className="flex items-start gap-3 p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
                <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5 text-yellow-500" />
                <div>
                  <p className="text-sm font-medium text-yellow-700 dark:text-yellow-400">Account not verified</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    If you haven&apos;t verified your account, the real owner of this nickname can claim it
                    by verifying their identity through our bot. Verify now to protect your account.
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
          <CardTitle>Notifications</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {pushSupported ? (
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Push Notifications</p>
                <p className="text-sm text-muted-foreground">
                  Receive notifications about game invites and friend requests
                </p>
              </div>
              <Button variant={pushSubscribed ? 'secondary' : 'default'} onClick={handlePushToggle} disabled={pushLoading}>
                {pushLoading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                {pushSubscribed ? 'Disable' : 'Enable'}
              </Button>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Push notifications are not supported in this browser.
            </p>
          )}
        </CardContent>
      </Card>

      {message && (
        <p className="text-sm text-muted-foreground text-center">{message}</p>
      )}
    </div>
  )
}

