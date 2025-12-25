'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { signOut } from 'next-auth/react'
import { PlaylistSearch } from '@/src/components/setup/PlaylistSearch'
import { TeamSetup } from '@/src/components/setup/TeamSetup'
import { useGameStore } from '@/src/store/gameStore'
import type { SpotifyPlaylist } from '@/src/lib/spotify/types'

interface SetupClientProps {
  accessToken: string
}

export function SetupClient({ accessToken }: SetupClientProps) {
  const persistedPlaylist = useGameStore((state) => state.playlist)
  const persistedTeams = useGameStore((state) => state.teams)
  const persistedDeviceId = useGameStore((state) => state.spotifyDeviceId)
  const setSpotifyDevice = useGameStore((state) => state.setSpotifyDevice)
  const [step, setStep] = useState<'sync' | 'playlist' | 'teams'>('playlist')
  const [selectedPlaylist, setSelectedPlaylist] = useState<SpotifyPlaylist | null>(null)
  const [showContinue, setShowContinue] = useState(false)
  const [isIOSDevice, setIsIOSDevice] = useState(false)
  const [availableDevices, setAvailableDevices] = useState<any[]>([])
  const [deviceReady, setDeviceReady] = useState(false)
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null)
  const setPlaylist = useGameStore((state) => state.setPlaylist)
  const router = useRouter()

  // Detect iOS - no sync needed anymore (using HTML5 audio previews)
  useEffect(() => {
    if (typeof window === 'undefined') return

    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream
    setIsIOSDevice(isIOS)

    if (isIOS) {
      console.log('📱 iOS detected - Will use 30-second preview clips (no Spotify app needed)')
    }
  }, [])

  // Check if we have existing game setup
  useEffect(() => {
    if (persistedPlaylist && persistedTeams.length > 0) {
      setShowContinue(true)
      setSelectedPlaylist(persistedPlaylist)
    }
  }, [persistedPlaylist, persistedTeams])

  const getAvailableDevices = async () => {
    try {
      const response = await fetch('https://api.spotify.com/v1/me/player/devices', {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        }
      })

      if (response.ok) {
        const data = await response.json()
        setAvailableDevices(data.devices || [])
        console.log('Available Spotify devices:', data.devices)

        // Prioritize smartphone/mobile devices
        const mobileDevice = data.devices.find((d: any) =>
          d.type === 'Smartphone' || d.name.toLowerCase().includes('iphone')
        )

        const activeDevice = data.devices.find((d: any) => d.is_active)
        const deviceToUse = mobileDevice || activeDevice || data.devices[0]

        if (deviceToUse) {
          setSelectedDeviceId(deviceToUse.id)
          setDeviceReady(true)
          console.log('✅ Using Spotify device:', deviceToUse.name, `(${deviceToUse.type})`)

          // Transfer playback to this device
          await transferPlayback(deviceToUse.id, deviceToUse.name)
        } else {
          console.warn('⚠️ No Spotify devices available')
          alert('Please open the Spotify app on your iPhone and start playing any song, then click "Find My iPhone".')
        }
      }
    } catch (error) {
      console.error('Failed to get devices:', error)
    }
  }

  const transferPlayback = async (deviceId: string, deviceName: string) => {
    try {
      const response = await fetch('https://api.spotify.com/v1/me/player', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          device_ids: [deviceId],
          play: false
        })
      })

      if (response.ok || response.status === 204) {
        console.log('✅ Transferred playback to device')
        // Save to store
        setSpotifyDevice(deviceId, deviceName)
      }
    } catch (error) {
      console.error('Failed to transfer playback:', error)
    }
  }

  const handleSyncComplete = () => {
    setStep('playlist')
  }

  const handlePlaylistSelect = (playlist: SpotifyPlaylist) => {
    setSelectedPlaylist(playlist)
  }

  const handleContinueToTeams = () => {
    if (selectedPlaylist) {
      setPlaylist(selectedPlaylist)
      setStep('teams')
    }
  }

  const handleTeamsComplete = () => {
    router.push('/game')
  }

  return (
    <div className="min-h-screen bg-black p-8">
      <div className="max-w-4xl mx-auto">
        {step !== 'sync' && (
          <div className="flex justify-end mb-4">
            <button
              onClick={() => signOut({ callbackUrl: '/' })}
              className="text-gray-400 hover:text-white transition-colors text-sm"
            >
              Log Out
            </button>
          </div>
        )}

        {step === 'sync' && (
          <div className="min-h-[80vh] flex items-center justify-center">
            <div className="max-w-md w-full">
              <div className="text-center mb-6">
                <div className="text-4xl mb-4">🔊</div>
                <h1 className="text-3xl font-bold text-white mb-2">Sync Spotify</h1>
                <p className="text-sm text-gray-400">Music will play on this iPhone</p>
              </div>

              <div className="bg-gray-800 p-4 rounded-xl mb-4">
                <p className="text-white text-sm mb-3">Setup Steps:</p>
                <div className="space-y-2 text-xs text-gray-300">
                  <div className="flex items-start">
                    <span className="text-green-400 mr-2">1.</span>
                    <span>Open the Spotify app on THIS iPhone</span>
                  </div>
                  <div className="flex items-start">
                    <span className="text-green-400 mr-2">2.</span>
                    <span>Play any song briefly (then pause it)</span>
                  </div>
                  <div className="flex items-start">
                    <span className="text-green-400 mr-2">3.</span>
                    <span>Return here and click "Find My iPhone"</span>
                  </div>
                </div>
              </div>

              <button
                onClick={getAvailableDevices}
                className="w-full bg-green-500 hover:bg-green-600 text-white font-bold py-3 px-6 rounded-full text-base transition-colors mb-3"
              >
                🔄 Find My iPhone
              </button>

              {availableDevices.length > 0 && (
                <div className="bg-gray-800 p-4 rounded-xl mb-3">
                  <p className="text-white text-sm mb-2">Available Devices:</p>
                  <div className="space-y-2">
                    {availableDevices.map((device) => (
                      <div
                        key={device.id}
                        className={`p-3 rounded-lg ${
                          device.id === selectedDeviceId
                            ? 'bg-green-600 border-2 border-green-400'
                            : 'bg-gray-700'
                        }`}
                      >
                        <div className="flex items-center justify-between text-white text-sm">
                          <span className="font-bold">{device.name}</span>
                          <span className="text-xs opacity-75">({device.type})</span>
                        </div>
                        {device.id === selectedDeviceId && (
                          <div className="text-xs text-green-200 mt-1">
                            🔊 Music will play here
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {deviceReady && selectedDeviceId && (
                <button
                  onClick={handleSyncComplete}
                  className="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 px-6 rounded-full text-base transition-colors mb-2"
                >
                  ✓ Continue to Game Setup
                </button>
              )}

              {!deviceReady && (
                <button
                  onClick={handleSyncComplete}
                  className="w-full bg-gray-600 hover:bg-gray-500 text-white font-bold py-2 px-6 rounded-full text-sm transition-colors"
                >
                  Skip (set up later)
                </button>
              )}
            </div>
          </div>
        )}

        {step === 'playlist' && (
          <>
            <h1 className="text-4xl font-bold text-white mb-2">Game Setup</h1>
            <p className="text-gray-400 mb-8">Select a playlist to use for the quiz</p>

            {showContinue && (
              <div className="mb-8 p-6 bg-gray-800 rounded-lg">
                <h2 className="text-2xl font-bold text-white mb-4">Continue Previous Game?</h2>
                <p className="text-gray-300 mb-4">
                  Playlist: <span className="text-green-400">{persistedPlaylist?.name}</span>
                </p>
                <p className="text-gray-300 mb-6">
                  Teams: <span className="text-green-400">{persistedTeams.map(t => t.name).join(', ')}</span>
                </p>
                <div className="flex gap-4">
                  <button
                    onClick={() => router.push('/game')}
                    className="bg-green-500 hover:bg-green-600 text-white font-bold py-3 px-8 rounded-full transition-colors flex-1"
                  >
                    Continue Game
                  </button>
                  <button
                    onClick={() => setShowContinue(false)}
                    className="bg-gray-600 hover:bg-gray-700 text-white font-bold py-3 px-8 rounded-full transition-colors flex-1"
                  >
                    New Game
                  </button>
                </div>
              </div>
            )}

            {!showContinue && (
              <>
                <PlaylistSearch accessToken={accessToken} onSelect={handlePlaylistSelect} />

                {selectedPlaylist && (
                  <div className="mt-8 flex justify-center">
                    <button
                      onClick={handleContinueToTeams}
                      className="bg-green-500 hover:bg-green-600 text-white font-bold py-4 px-12 rounded-full text-lg transition-colors"
                    >
                      Continue with {selectedPlaylist.name}
                    </button>
                  </div>
                )}
              </>
            )}
          </>
        )}

        {step === 'teams' && <TeamSetup onComplete={handleTeamsComplete} />}
      </div>
    </div>
  )
}
