'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { SetupClient } from './SetupClient'

export default function SetupPage() {
  const { data: session, status } = useSession()
  const router = useRouter()

  if (status === 'loading') {
    return (
      <div className="min-h-screen cassette-gradient flex items-center justify-center">
        <p
          className="text-white text-2xl"
          style={{
            textShadow: '0 0 5px var(--neon-pink), 0 0 10px var(--neon-pink), 0 2px 4px rgba(0,0,0,0.8)',
          }}
        >
          Loading...
        </p>
      </div>
    )
  }

  if (!session?.accessToken) {
    router.push('/')
    return null
  }

  return <SetupClient accessToken={session.accessToken} />
}
