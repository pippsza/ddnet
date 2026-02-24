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
} from '@/components/ui/form'
import { toast } from 'sonner'
import { Loader2, Eye, EyeOff } from 'lucide-react'
import { useAuth } from '@/components/auth/AuthProvider'

const loginSchema = z.object({
  nickname: z.string().min(2).max(16),
  password: z.string().min(6),
})

type LoginFormValues = z.infer<typeof loginSchema>

interface LoginFormProps {
  onPasswordVisibilityChange?: (visible: boolean) => void
}

export function LoginForm({ onPasswordVisibilityChange }: LoginFormProps) {
  const t = useTranslations('auth')
  const router = useRouter()
  const { refresh } = useAuth()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { nickname: '', password: '' },
  })

  function togglePassword() {
    const next = !showPassword
    setShowPassword(next)
    onPasswordVisibilityChange?.(next)
  }

  async function onSubmit(data: LoginFormValues) {
    setIsLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/users/login', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: data.nickname,
          password: data.password,
        }),
      })

      const result = await res.json()

      if (!res.ok) {
        throw new Error(result.errors?.[0]?.message || result.message || t('invalidCredentials'))
      }

      await refresh()
      router.push('/app')
      router.refresh()
    } catch (err) {
      const message = err instanceof Error ? err.message : t('loginError')
      setError(message || t('invalidCredentials'))
      toast.error(message || t('invalidCredentials'))
    } finally {
      setIsLoading(false)
    }
  }

  return (
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
          name="nickname"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('nickname')}</FormLabel>
              <FormControl>
                <Input type="text" placeholder="PlayerName" {...field} />
              </FormControl>
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
              <FormMessage />
            </FormItem>
          )}
        />
        {error && (
          <p className="text-sm text-destructive text-center">{error}</p>
        )}
        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {t('signIn')}
        </Button>
      </form>
    </Form>
  )
}
