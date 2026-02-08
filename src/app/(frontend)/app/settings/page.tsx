'use client'

import { useState, useEffect, useCallback } from 'react'
import useSWR from 'swr'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { TeeAvatarWithFallback, getDDNetSkinUrl } from '@/components/tee/TeeAvatar'
import { cn } from '@/lib/utils'

const fetcher = (url: string) => fetch(url).then((r) => r.json())

type VerificationStep = 'idle' | 'starting' | 'searching' | 'found' | 'confirming' | 'success' | 'failed' | 'expired'

export default function SettingsPage() {
  const { data: user, mutate } = useSWR('/api/users/me', fetcher)
  const [message, setMessage] = useState('')
  const [pushSupported, setPushSupported] = useState(false)
  const [pushSubscribed, setPushSubscribed] = useState(false)

  // Verification state
  const [verifyStep, setVerifyStep] = useState<VerificationStep>('idle')
  const [requestId, setRequestId] = useState<string | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [currentServer, setCurrentServer] = useState<string | null>(null)
  const [verifyError, setVerifyError] = useState<string | null>(null)

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
    if (!requestId || verifyStep !== 'searching') return

    const interval = setInterval(async () => {
      try {
        const res = await fetch('/api/verification/status', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ requestId }),
        })
        const data = await res.json()

        if (data.status === 'active') {
          setVerifyStep('found')
          setCurrentServer(data.currentServer || null)
          clearInterval(interval)
        } else if (data.status === 'expired') {
          setVerifyStep('expired')
          setVerifyError('Verification request expired. Please try again.')
          clearInterval(interval)
        } else if (data.status === 'failed') {
          setVerifyStep('failed')
          setVerifyError('Bot could not find you on any server.')
          clearInterval(interval)
        } else if (data.status === 'success') {
          setVerifyStep('success')
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
    setCurrentServer(null)
    try {
      const res = await fetch('/api/verification/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nickname: user?.user?.username }),
      })
      const data = await res.json()

      if (res.status === 409) {
        // Already have active request — resume it
        setRequestId(data.requestId)
        setToken(data.token)
        setVerifyStep(data.status === 'active' ? 'found' : 'searching')
        return
      }

      if (!res.ok) throw new Error(data.error)

      setRequestId(data.requestId)
      setToken(data.token)
      setVerifyStep('searching')
    } catch (err: unknown) {
      setVerifyStep('failed')
      setVerifyError(err instanceof Error ? err.message : 'Failed to start verification')
    }
  }, [user?.user?.username])

  const confirmVerification = useCallback(async () => {
    if (!requestId || !token) return
    setVerifyStep('confirming')
    try {
      const res = await fetch('/api/verification/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId, token }),
      })
      const data = await res.json()

      if (!res.ok) throw new Error(data.error)

      setVerifyStep('success')
      mutate()
    } catch (err: unknown) {
      setVerifyStep('failed')
      setVerifyError(err instanceof Error ? err.message : 'Confirmation failed')
    }
  }, [requestId, token, mutate])

  const resetVerification = () => {
    setVerifyStep('idle')
    setRequestId(null)
    setToken(null)
    setCurrentServer(null)
    setVerifyError(null)
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
            <TeeAvatarWithFallback
              skinUrl={skinUrl}
              bodyColor={user?.user?.ingameStats?.skin?.colorBody}
              feetColor={user?.user?.ingameStats?.skin?.colorFeet}
              size="lg"
              useCustomColors={!!(user?.user?.ingameStats?.skin?.colorBody || user?.user?.ingameStats?.skin?.colorFeet)}
            />
            <div>
              <p className="text-lg font-semibold">{user?.user?.username || 'Loading...'}</p>
              <p className="text-sm text-muted-foreground capitalize">{user?.user?.roles}</p>
            </div>
          </div>
          <div>
            <Label>Username</Label>
            <Input value={user?.user?.username || ''} disabled />
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
                    Verify your DDNet nickname to unlock all features. A bot will search for you on active servers
                    and confirm your identity.
                  </p>
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

              {verifyStep === 'searching' && (
                <div className="space-y-4">
                  <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/20 space-y-3">
                    <div className="flex items-center gap-3">
                      <Spinner className="text-blue-500" />
                      <div>
                        <p className="font-medium text-blue-700 dark:text-blue-400">
                          Searching for you on servers...
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Make sure you are connected to a DDNet server with the nickname &quot;{user?.user?.username}&quot;
                        </p>
                      </div>
                    </div>
                  </div>

                  {token && (
                    <div className="p-4 rounded-lg bg-muted border space-y-2">
                      <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">Your Verification Token</p>
                      <p className="text-2xl font-mono font-bold tracking-widest text-center py-2">
                        {token}
                      </p>
                      <p className="text-xs text-muted-foreground text-center">
                        The bot will send this code in-game to confirm it found you.
                      </p>
                    </div>
                  )}

                  <Button variant="outline" size="sm" onClick={resetVerification}>
                    Cancel
                  </Button>
                </div>
              )}

              {verifyStep === 'found' && (
                <div className="space-y-4">
                  <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/20 space-y-2">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center">
                        <svg className="w-5 h-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                      <div>
                        <p className="font-medium text-green-700 dark:text-green-400">
                          Bot found you!
                        </p>
                        {currentServer && (
                          <p className="text-sm text-muted-foreground">
                            On server: {currentServer}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  <Button onClick={confirmVerification} className="w-full">
                    Confirm Verification
                  </Button>
                </div>
              )}

              {verifyStep === 'confirming' && (
                <div className="flex items-center gap-3 p-4 rounded-lg bg-muted">
                  <Spinner />
                  <p className="text-sm">Confirming verification...</p>
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
