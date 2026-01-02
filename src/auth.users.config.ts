import { NextAuthConfig } from 'next-auth'
import Google from 'next-auth/providers/google'
export const usersAuthConfig: NextAuthConfig = {
  basePath: '/api/auth/users',
  trustHost: true,
  theme: {
    logo: 'https://placehold.co/150x50/transparent/white?text=User\\nLogin',
  },

  cookies: {
    sessionToken: {
      name: 'authjs.user-session-token',
    },
    csrfToken: {
      name: 'authjs.user-csrf-token',
    },
    callbackUrl: {
      name: 'authjs.user-callback-url',
    },
  },
  providers: [
    Google({
      allowDangerousEmailAccountLinking: true,
      clientId: process.env.AUTH_GOOGLE_ID || '',
      clientSecret: process.env.AUTH_GOOGLE_SECRET || '',
    }),
  ],
  callbacks: {
    authorized: ({ auth }) => auth?.user && new Date() < new Date(auth.expires),
  },
}
