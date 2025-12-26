'use client'

import { signIn, useSession } from 'next-auth/react'

export default function Home() {
  const { data: session, status } = useSession()

  if (status === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black">
        <p className="text-white text-2xl">Loading...</p>
      </div>
    )
  }

  if (session) {
    // Redirect to test-audio on client side
    if (typeof window !== 'undefined') {
      window.location.href = '/test-audio'
    }
    return (
      <div className="flex min-h-screen items-center justify-center bg-black">
        <p className="text-white text-2xl">Redirecting...</p>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-black">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-white mb-8">Music Quiz Game</h1>
        <p className="text-white text-xl mb-8">
          A multiplayer music quiz using Spotify
        </p>
        <button
          onClick={() => signIn('spotify')}
          className="bg-green-500 hover:bg-green-600 text-white font-bold py-4 px-8 rounded-full text-lg transition-colors"
        >
          Login with Spotify
        </button>
      </div>
    </div>
  )
}
