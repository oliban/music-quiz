'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { SetupClient } from './SetupClient'

export default function SetupPage() {
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

  return <SetupClient accessToken={session.accessToken} />
}
