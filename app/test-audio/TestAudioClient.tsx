'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { signOut } from 'next-auth/react'
import { SpotifyClient } from '@/src/lib/spotify/api'

interface TestAudioClientProps {
  accessToken: string
}

export function TestAudioClient({ accessToken }: TestAudioClientProps) {
  const [isTestingAudio, setIsTestingAudio] = useState(false)
  const [testStatus, setTestStatus] = useState<string>('')
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const router = useRouter()

  const handleTestAudio = async () => {
    if (isTestingAudio) return

    try {
      setIsTestingAudio(true)
      setTestStatus('Fetching your top songs...')

      const spotifyClient = new SpotifyClient(accessToken)

      // Fetch user's top tracks directly from Spotify API
      const response = await fetch('https://api.spotify.com/v1/me/top/tracks?limit=50', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      })

      if (!response.ok) {
        throw new Error(`Failed to fetch top tracks: ${response.status}`)
      }

      const data = await response.json()
      const allTracks = data.items || []

      if (allTracks.length === 0) {
        setTestStatus('No top tracks found. Listen to more music on Spotify first!')
        setIsTestingAudio(false)
        return
      }

      // Use top 10 tracks
      const top10 = allTracks.slice(0, 10)

      setTestStatus('Extracting preview URL from Spotify embed...')

      // Get a random track from top 10 and extract its preview URL (same method as game)
      const randomTrack = top10[Math.floor(Math.random() * top10.length)]

      const trackIds = [randomTrack.id]
      const previewUrls = await spotifyClient.getPreviewUrls(trackIds)
      const previewUrl = previewUrls.get(randomTrack.id)

      if (!previewUrl) {
        setTestStatus('No preview available. Try again.')
        setIsTestingAudio(false)
        return
      }

      setTestStatus(`Playing: ${randomTrack.name} by ${randomTrack.artists[0].name}`)

      // Create and play audio
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current = null
      }

      const audio = new Audio(previewUrl)
      audioRef.current = audio

      audio.onended = () => {
        setIsTestingAudio(false)
        setTestStatus('Test completed!')
      }

      audio.onerror = () => {
        setIsTestingAudio(false)
        setTestStatus('Failed to play audio')
      }

      await audio.play()
    } catch (error) {
      setTestStatus('Error: ' + (error instanceof Error ? error.message : 'Unknown error'))
      setIsTestingAudio(false)
    }
  }

  const handleStopTest = () => {
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current = null
    }
    setIsTestingAudio(false)
    setTestStatus('')
  }

  const handleContinue = () => {
    handleStopTest()
    router.push('/setup')
  }

  // Cleanup audio on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current = null
      }
    }
  }, [])

  return (
    <div className="min-h-screen bg-black p-8">
      <div className="max-w-2xl mx-auto">
        <div className="flex justify-end mb-4">
          <button
            onClick={() => signOut({ callbackUrl: '/' })}
            className="text-gray-400 hover:text-white transition-colors text-sm"
          >
            Log Out
          </button>
        </div>

        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-white mb-4">Test Your Audio</h1>
          <p className="text-gray-400 text-lg">
            Connect your Bluetooth speakers and adjust the volume
          </p>
          <p className="text-gray-500 text-sm mt-2">
            This is optional - you can skip and test during the game
          </p>
        </div>

        <div className="bg-gray-800 rounded-lg p-8 mb-8">
          <div className="flex flex-col items-center gap-6">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-white mb-2">Spotify Audio Test</h2>
              <p className="text-gray-400">
                Play a random song from your top 10 most played tracks
              </p>
            </div>

            <div className="flex flex-col gap-4 w-full max-w-md">
              <div className="flex gap-3">
                <button
                  onClick={handleTestAudio}
                  disabled={isTestingAudio}
                  className="bg-blue-500 hover:bg-blue-600 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-bold py-4 px-8 rounded-lg transition-colors flex-1 text-lg"
                >
                  {isTestingAudio ? 'Playing...' : 'Test Audio'}
                </button>
                {isTestingAudio && (
                  <button
                    onClick={handleStopTest}
                    className="bg-red-500 hover:bg-red-600 text-white font-bold py-4 px-8 rounded-lg transition-colors text-lg"
                  >
                    Stop
                  </button>
                )}
              </div>

              {testStatus && (
                <div className="text-sm text-gray-300 bg-gray-700 rounded p-4 text-center">
                  {testStatus}
                </div>
              )}
            </div>

            <div className="mt-8 pt-8 border-t border-gray-700 w-full">
              <div className="flex justify-center">
                <button
                  onClick={handleContinue}
                  className="bg-green-500 hover:bg-green-600 text-white font-bold py-4 px-12 rounded-full text-lg transition-colors"
                >
                  Continue to Setup
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-gray-900 rounded-lg p-6">
          <h3 className="text-lg font-bold text-white mb-3">Setup Tips:</h3>
          <ul className="text-gray-400 space-y-2">
            <li>• Connect to your Bluetooth speakers before starting</li>
            <li>• Adjust your device volume to a comfortable level</li>
            <li>• Make sure your speakers are turned on and paired</li>
            <li>• The game plays 30-second music previews from Spotify</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
