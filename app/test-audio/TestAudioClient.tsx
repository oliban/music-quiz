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
    <div className="relative min-h-screen cassette-gradient p-8 overflow-hidden">
      {/* Scan lines overlay */}
      <div className="retro-scanlines absolute inset-0" />

      <div className="relative z-10 max-w-2xl mx-auto">
        <div className="flex justify-end mb-4">
          <button
            onClick={() => signOut({ callbackUrl: '/' })}
            className="text-gray-300 hover:text-white transition-colors text-sm"
            style={{ fontFamily: 'var(--font-geist-sans)' }}
          >
            Log Out
          </button>
        </div>

        <div className="text-center mb-12 animate-fadeIn">
          <h1
            className="text-5xl md:text-6xl font-bold mb-4"
            style={{
              fontFamily: 'var(--font-audiowide)',
              color: '#FFFFFF',
              textShadow: '0 0 5px var(--neon-pink), 0 0 10px var(--neon-pink), 0 0 15px var(--hot-magenta), 0 2px 4px rgba(0,0,0,0.8)',
              WebkitTextStroke: '1px rgba(255, 110, 199, 0.3)',
            }}
          >
            AUDIO TEST
          </h1>
          <p
            className="text-gray-300 text-xl"
            style={{ fontFamily: 'var(--font-righteous)' }}
          >
            Connect your speakers and adjust the volume
          </p>
        </div>

        <div className="bg-gray-800/80 rounded-lg p-6 mb-8 border border-gray-700">
          <div className="flex flex-col items-center gap-4">
            <div className="text-center">
              <p className="text-gray-400">
                Play a random song from your top 10 most played tracks
              </p>
            </div>

            <div className="flex flex-col gap-4 w-full max-w-md">
              <div className="flex gap-3">
                <button
                  onClick={handleTestAudio}
                  disabled={isTestingAudio}
                  className="text-white font-bold py-4 px-8 rounded-lg transition-all duration-300 flex-1 text-lg disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{
                    backgroundColor: isTestingAudio ? 'var(--midnight-purple)' : 'var(--neon-pink)',
                    fontFamily: 'var(--font-righteous)',
                    boxShadow: isTestingAudio ? 'none' : '0 0 20px var(--neon-pink), 0 0 40px var(--neon-pink)',
                  }}
                  onMouseEnter={(e) => {
                    if (!isTestingAudio) {
                      e.currentTarget.style.backgroundColor = 'var(--hot-magenta)';
                      e.currentTarget.style.boxShadow = '0 0 30px var(--hot-magenta), 0 0 60px var(--hot-magenta)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isTestingAudio) {
                      e.currentTarget.style.backgroundColor = 'var(--neon-pink)';
                      e.currentTarget.style.boxShadow = '0 0 20px var(--neon-pink), 0 0 40px var(--neon-pink)';
                    }
                  }}
                >
                  {isTestingAudio ? 'Playing...' : 'Test Audio'}
                </button>
                {isTestingAudio && (
                  <button
                    onClick={handleStopTest}
                    className="text-white font-bold py-4 px-8 rounded-lg transition-all duration-300 text-lg"
                    style={{
                      backgroundColor: 'var(--hot-magenta)',
                      fontFamily: 'var(--font-righteous)',
                      boxShadow: '0 0 20px var(--hot-magenta)',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = '#CC0066';
                      e.currentTarget.style.boxShadow = '0 0 30px var(--hot-magenta)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'var(--hot-magenta)';
                      e.currentTarget.style.boxShadow = '0 0 20px var(--hot-magenta)';
                    }}
                  >
                    Stop
                  </button>
                )}
              </div>

              {testStatus && (
                <div className="text-sm text-gray-300 bg-gray-800/60 rounded p-4 text-center border border-gray-700">
                  {testStatus}
                </div>
              )}
            </div>

            <div className="mt-4 w-full">
              <div className="flex justify-center">
                <button
                  onClick={handleContinue}
                  className="text-white font-bold py-4 px-12 rounded-full text-lg transition-all duration-300 transform hover:scale-105"
                  style={{
                    backgroundColor: 'var(--neon-pink)',
                    fontFamily: 'var(--font-righteous)',
                    boxShadow: '0 0 20px var(--neon-pink), 0 0 40px var(--neon-pink)',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'var(--hot-magenta)';
                    e.currentTarget.style.boxShadow = '0 0 30px var(--hot-magenta), 0 0 60px var(--hot-magenta)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'var(--neon-pink)';
                    e.currentTarget.style.boxShadow = '0 0 20px var(--neon-pink), 0 0 40px var(--neon-pink)';
                  }}
                >
                  Continue to Setup
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-gray-800/80 rounded-lg p-6 border border-gray-700">
          <h3
            className="text-lg font-bold text-white mb-3"
            style={{ fontFamily: 'var(--font-righteous)' }}
          >
            Setup Tips:
          </h3>
          <ul className="text-gray-400 space-y-2">
            <li>• Connect to your Bluetooth speakers before starting</li>
            <li>• Adjust your device volume to a comfortable level</li>
            <li>• Make sure your speakers are turned on and paired</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
