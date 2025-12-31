import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/src/lib/auth'
import { SpotifyClient } from '@/src/lib/spotify/api'

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions)

  if (!session?.accessToken) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const searchParams = request.nextUrl.searchParams
  const query = searchParams.get('q')

  if (!query) {
    return NextResponse.json({ error: 'Query parameter required' }, { status: 400 })
  }

  try {
    const client = new SpotifyClient(session.accessToken)
    const playlists = await client.searchPlaylists(query)

    return NextResponse.json({ playlists })
  } catch (error) {
    console.error('Spotify search error:', error)

    // Check if it's a structured error with status
    if (typeof error === 'object' && error !== null && 'status' in error) {
      const apiError = error as { status: number; message: string; isAuthorizationError?: boolean }
      return NextResponse.json(
        {
          error: apiError.message,
          isAuthorizationError: apiError.isAuthorizationError
        },
        { status: apiError.status }
      )
    }

    return NextResponse.json({ error: 'Search failed' }, { status: 500 })
  }
}
