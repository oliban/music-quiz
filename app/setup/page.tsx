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
        <p className="text-white text-2xl neon-text">Loading...</p>
      </div>
    )
  }

  if (!session?.accessToken) {
    router.push('/')
    return null
  }

  return <SetupClient accessToken={session.accessToken} />
}
