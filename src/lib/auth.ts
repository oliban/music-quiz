import { NextAuthOptions } from 'next-auth'
import SpotifyProvider from 'next-auth/providers/spotify'

const SPOTIFY_SCOPES = [
  'user-read-email',
  'user-read-private',
  'playlist-read-private',
  'playlist-read-collaborative',
  'user-top-read', // For accessing user's top tracks (used in test audio fallback)
].join(' ')

async function refreshAccessToken(token: any) {
  try {
    console.log('🔄 Attempting to refresh access token...')

    const basicAuth = Buffer.from(
      `${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`
    ).toString('base64')

    const response = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        Authorization: `Basic ${basicAuth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: token.refreshToken,
      }),
    })

    const refreshedTokens = await response.json()

    if (!response.ok) {
      console.error('❌ Token refresh failed:', refreshedTokens)
      throw refreshedTokens
    }

    console.log('✅ Token refreshed successfully')

    return {
      ...token,
      accessToken: refreshedTokens.access_token,
      expiresAt: Date.now() + refreshedTokens.expires_in * 1000,
      refreshToken: refreshedTokens.refresh_token ?? token.refreshToken, // Fall back to old refresh token
    }
  } catch (error) {
    console.error('❌ Error refreshing access token:', error)
    return {
      ...token,
      error: 'RefreshAccessTokenError',
    }
  }
}

export const authOptions: NextAuthOptions = {
  providers: [
    SpotifyProvider({
      clientId: process.env.SPOTIFY_CLIENT_ID!,
      clientSecret: process.env.SPOTIFY_CLIENT_SECRET!,
      authorization: {
        params: {
          scope: SPOTIFY_SCOPES,
          show_dialog: true, // Force Spotify to show authorization dialog every time
        },
      },
    }),
  ],
  callbacks: {
    async jwt({ token, account, user }) {
      // Initial sign in
      if (account && user) {
        console.log('🔐 Initial sign in - storing tokens')
        const newToken = {
          ...token,
          accessToken: account.access_token,
          refreshToken: account.refresh_token,
          expiresAt: (account.expires_at ?? 0) * 1000, // Convert to milliseconds
          user,
        }
        console.log('✅ Token stored, expires at:', new Date(newToken.expiresAt))
        return newToken
      }

      // Return previous token if it hasn't expired yet
      const expiresAt = token.expiresAt as number
      const now = Date.now()
      if (now < expiresAt) {
        const timeUntilExpiry = Math.floor((expiresAt - now) / 1000 / 60)
        console.log(`✅ Token still valid (expires in ${timeUntilExpiry} minutes)`)
        return token
      }

      // Token has expired, refresh it
      console.log('⏰ Token expired, refreshing...')
      return refreshAccessToken(token)
    },
    async session({ session, token }) {
      // Check if token refresh failed
      if (token.error) {
        console.error('Session error: Token refresh failed')
        // Return session without access token to force re-authentication
        return session
      }

      // Add access token to session
      session.accessToken = token.accessToken as string

      // Log for debugging (remove in production later)
      if (!session.accessToken) {
        console.error('Session callback: No access token available')
      }

      return session
    },
    async redirect({ url, baseUrl }) {
      // After successful login, redirect to test-audio page
      if (url === baseUrl || url === `${baseUrl}/`) {
        return `${baseUrl}/test-audio`
      }
      // Allows relative callback URLs
      if (url.startsWith('/')) return `${baseUrl}${url}`
      // Allows callback URLs on the same origin
      if (new URL(url).origin === baseUrl) return url
      return baseUrl
    },
  },
  pages: {
    signIn: '/',
  },
  cookies: {
    sessionToken: {
      name: 'next-auth.session-token',
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production',
      },
    },
    callbackUrl: {
      name: 'next-auth.callback-url',
      options: {
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production',
      },
    },
    csrfToken: {
      name: 'next-auth.csrf-token',
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production',
      },
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
}
