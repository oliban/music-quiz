'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { GameClient } from './GameClient'

export default function GamePage() {
  const { data: session, status } = useSession()
  const router = useRouter()

  if (status === 'loading') {
    return (
      <div className="min-h-screen cassette-gradient flex items-center justify-center">
        <p className="text-white text-2xl neon-text">Loading...</p>
      </div>
    )
  }

  if (!session?.accessToken) {
    router.push('/')
    return null
  }

  return <GameClient accessToken={session.accessToken} />
}
