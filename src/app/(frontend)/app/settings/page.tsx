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
import { cn } from '@/lib/utils'
import { Server } from 'lucide-react'

const fetcher = (url: string) => fetch(url).then((r) => r.json())

interface VerificationServer {
  name: string
  ip: string
  port: number
  region?: string | null
}

type VerificationStep = 'idle' | 'starting' | 'pending' | 'success' | 'failed' | 'expired'

export default function SettingsPage() {
  const { data: user, mutate } = useSWR('/api/users/me', fetcher)
  const { data: serversData } = useSWR<{ servers: VerificationServer[] }>('/api/verification/servers', fetcher)
  const [message, setMessage] = useState('')
  const [pushSupported, setPushSupported] = useState(false)
  const [pushSubscribed, setPushSubscribed] = useState(false)

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
    if (!pushSupported) return
    try {
      const reg = await navigator.serviceWorker.ready

      if (pushSubscribed) {
        const sub = await reg.pushManager.getSubscription()
        if (sub) await sub.unsubscribe()
        setPushSubscribed(false)
        return
      }

      const keyRes = await fetch('/api/push/subscribe')
      const { vapidPublicKey } = await keyRes.json()

      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: vapidPublicKey,
      })

      await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sub.toJSON()),
      })

      setPushSubscribed(true)
    } catch {
      setMessage('Failed to toggle push notifications')
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

  const skinUrl = user?.user?.ingameStats?.skin?.name
    ? getDDNetSkinUrl(user.user.ingameStats.skin.name)
    : undefined

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">Settings</h1>

      {/* Profile Card */}
      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
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
              <p className="text-lg font-semibold">{user?.user?.ingameNick || user?.user?.username || 'Loading...'}</p>
              <RoleBadge role={user?.user?.roles} />
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
        </CardContent>
      </Card>

      {/* Verification Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Nickname Verification
            {user?.user?.isSystemVerified && (
              <Badge variant="default" className="bg-green-600">Verified</Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {user?.user?.isSystemVerified ? (
            <div className="flex items-center gap-3 p-4 rounded-lg bg-green-500/10 border border-green-500/20">
              <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center">
                <svg className="w-5 h-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <p className="font-medium text-green-700 dark:text-green-400">Your nickname is verified</p>
                <p className="text-sm text-muted-foreground">You have full access to all features.</p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {verifyStep === 'idle' && (
                <>
                  <p className="text-sm text-muted-foreground">
                    Verify your DDNet nickname to unlock all features. Join one of the servers below,
                    log in with <code className="text-xs bg-muted px-1 py-0.5 rounded">/login</code>, then click the button.
                  </p>
                  {servers.length > 0 && (
                    <div className="p-3 rounded-lg bg-muted/50 border space-y-1.5">
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Verification Servers</p>
                      {servers.map((s, i) => (
                        <div key={i} className="flex items-center gap-2 text-sm">
                          <Server className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                          <span className="font-medium">{s.name}</span>
                          <span className="font-mono text-xs text-muted-foreground">{s.ip}:{s.port}</span>
                          {s.region && <Badge variant="outline" className="text-xs py-0">{s.region}</Badge>}
                        </div>
                      ))}
                    </div>
                  )}
                  <Button onClick={startVerification}>
                    Verify Nickname
                  </Button>
                </>
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
                    <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center">
                      <svg className="w-5 h-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <div>
                      <p className="font-medium text-green-700 dark:text-green-400">Verification successful!</p>
                      <p className="text-sm text-muted-foreground">Your nickname has been verified.</p>
                    </div>
                  </div>
                </div>
              )}

              {(verifyStep === 'failed' || verifyStep === 'expired') && (
                <div className="space-y-3">
                  <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-red-500/20 flex items-center justify-center">
                        <svg className="w-5 h-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
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
              <Button variant={pushSubscribed ? 'secondary' : 'default'} onClick={handlePushToggle}>
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

function Spinner({ className }: { className?: string }) {
  return (
    <svg
      className={cn('w-5 h-5 animate-spin', className)}
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  )
}
