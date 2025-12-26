import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/src/lib/auth'
import { TestAudioClient } from './TestAudioClient'

export default async function TestAudioPage() {
  const session = await getServerSession(authOptions)

  if (!session?.accessToken) {
    redirect('/')
  }

  return <TestAudioClient accessToken={session.accessToken} />
}
