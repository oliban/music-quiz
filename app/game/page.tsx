'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { GameClient } from './GameClient'

export default function GamePage() {
  const { data: session, status } = useSession()
  const router = useRouter()

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center text-white">
        Loading...
      </div>
    )
  }

  if (!session?.accessToken) {
    router.push('/')
    return null
  }

  return <GameClient accessToken={session.accessToken} />
}
