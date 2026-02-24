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
import { Loader2, Info, ShieldAlert, Eye, EyeOff } from 'lucide-react'
import { useAuth } from '@/components/auth/AuthProvider'

const registerSchema = z
  .object({
    username: z.string().min(2).max(32),
    ingameNick: z.string().min(2).max(16),
    password: z.string().min(8),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })

type RegisterFormValues = z.infer<typeof registerSchema>

interface RegisterFormProps {
  onPasswordVisibilityChange?: (visible: boolean) => void
  onNickTakenError?: (ingameNick: string) => void
}

export function RegisterForm({ onPasswordVisibilityChange, onNickTakenError }: RegisterFormProps) {
  const t = useTranslations('auth')
  const router = useRouter()
  const { refresh } = useAuth()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  const form = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: { username: '', ingameNick: '', password: '', confirmPassword: '' },
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

  async function onSubmit(data: RegisterFormValues) {
    setIsLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: data.username,
          ingameNick: data.ingameNick,
          password: data.password,
        }),
      })

      const result = await res.json()

      if (!res.ok) {
        const errorMessage =
          result.errors?.[0]?.message ||
          result.errors?.[0]?.data?.errors?.[0]?.message ||
          result.errors?.[0]?.data?.[0]?.message ||
          result.message ||
          (typeof result === 'string' ? result : null) ||
          t('registrationError')

        const isNickTaken =
          errorMessage.includes('already taken') ||
          errorMessage.includes('already protected')

        if (isNickTaken) {
          onNickTakenError?.(data.ingameNick)
        }

        throw new Error(errorMessage)
      }

      toast.success(t('registrationSuccess'))

      // Auto-login after registration
      const loginRes = await fetch('/api/users/login', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: data.username, password: data.password }),
      })

      if (loginRes.ok) {
        await refresh()
        router.push('/app')
        router.refresh()
      } else {
        router.push('/login')
      }
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
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>{t('hardResetInfo')}</AlertDescription>
      </Alert>

      <Form {...form}>
        <form
          onSubmit={(e) => {
            e.preventDefault()
            form.handleSubmit(onSubmit)(e)
          }}
          className="space-y-4"
        >
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
            name="ingameNick"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('ingameNickname')}</FormLabel>
                <FormControl>
                  <Input placeholder="YourDDNetNick" {...field} />
                </FormControl>
                <FormDescription>{t('ingameNicknameDescription')}</FormDescription>
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
            <div className="space-y-2">
              <p className="text-sm text-destructive text-center">{error}</p>
              {(error.includes('already taken') || error.includes('already protected')) && (
                <Alert variant="default" className="border-yellow-500/20 bg-yellow-500/10">
                  <ShieldAlert className="h-4 w-4 text-yellow-500" />
                  <AlertDescription className="text-sm">
                    {t('nickTakenCanClaim')}
                  </AlertDescription>
                </Alert>
              )}
            </div>
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
