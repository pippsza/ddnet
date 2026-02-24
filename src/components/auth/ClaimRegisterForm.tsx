'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useTranslations } from 'next-intl'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from '@/components/ui/form'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { toast } from 'sonner'
import { Loader2, ShieldCheck, Eye, EyeOff } from 'lucide-react'
import { useAuth } from '@/components/auth/AuthProvider'

const claimRegisterSchema = z
  .object({
    username: z.string().min(2).max(32),
    password: z.string().min(8),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })

type ClaimRegisterFormValues = z.infer<typeof claimRegisterSchema>

interface ClaimRegisterFormProps {
  ingameNick: string
  claimId: string
  onPasswordVisibilityChange?: (visible: boolean) => void
}

export function ClaimRegisterForm({
  ingameNick,
  claimId,
  onPasswordVisibilityChange,
}: ClaimRegisterFormProps) {
  const t = useTranslations('auth')
  const router = useRouter()
  const { refresh } = useAuth()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  const form = useForm<ClaimRegisterFormValues>({
    resolver: zodResolver(claimRegisterSchema),
    defaultValues: { username: '', password: '', confirmPassword: '' },
  })

  function togglePassword() {
    const next = !showPassword
    setShowPassword(next)
    onPasswordVisibilityChange?.(next || showConfirmPassword)
  }

  function toggleConfirmPassword() {
    const next = !showConfirmPassword
    setShowConfirmPassword(next)
    onPasswordVisibilityChange?.(showPassword || next)
  }

  async function onSubmit(data: ClaimRegisterFormValues) {
    setIsLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/auth/register-after-claim', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          claimId,
          username: data.username,
          password: data.password,
          ingameNick,
        }),
      })

      const result = await res.json()

      if (!res.ok) {
        throw new Error(result.error || t('registrationError'))
      }

      toast.success(t('registrationSuccess'))
      await refresh()
      router.push('/app')
      router.refresh()
    } catch (err) {
      const message = err instanceof Error ? err.message : t('registrationError')
      setError(message)
      toast.error(message)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      <Alert className="border-green-500/20 bg-green-500/10">
        <ShieldCheck className="h-4 w-4 text-green-500" />
        <AlertDescription className="text-sm">
          {t('claimSuccessDescription')}
        </AlertDescription>
      </Alert>

      <Form {...form}>
        <form
          onSubmit={(e) => {
            e.preventDefault()
            form.handleSubmit(onSubmit)(e)
          }}
          className="space-y-4"
        >
          {/* Ingame nick — readonly */}
          <div className="space-y-2">
            <FormLabel>{t('ingameNickname')}</FormLabel>
            <Input value={ingameNick} disabled />
          </div>

          <FormField
            control={form.control}
            name="username"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('platformNickname')}</FormLabel>
                <FormControl>
                  <Input placeholder="my_login" {...field} />
                </FormControl>
                <FormDescription>{t('platformNicknameDescription')}</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('password')}</FormLabel>
                <FormControl>
                  <div className="relative">
                    <Input type={showPassword ? 'text' : 'password'} {...field} />
                    <button
                      type="button"
                      tabIndex={-1}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      onClick={togglePassword}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </FormControl>
                <FormDescription>{t('passwordRequirements')}</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="confirmPassword"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('confirmPassword')}</FormLabel>
                <FormControl>
                  <div className="relative">
                    <Input type={showConfirmPassword ? 'text' : 'password'} {...field} />
                    <button
                      type="button"
                      tabIndex={-1}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      onClick={toggleConfirmPassword}
                    >
                      {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          {error && (
            <p className="text-sm text-destructive text-center">{error}</p>
          )}
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {t('createAccount')}
          </Button>
        </form>
      </Form>
    </div>
  )
}
