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
  const [step, setStep] = useState<'playlist' | 'teams'>('playlist')
  const [selectedPlaylist, setSelectedPlaylist] = useState<SpotifyPlaylist | null>(null)
  const [showContinue, setShowContinue] = useState(false)
  const setPlaylist = useGameStore((state) => state.setPlaylist)
  const router = useRouter()

  // Check if we have existing game setup
  useEffect(() => {
    if (persistedPlaylist && persistedTeams.length > 0) {
      setShowContinue(true)
      setSelectedPlaylist(persistedPlaylist)
    }
  }, [persistedPlaylist, persistedTeams])

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
        <div className="flex justify-end mb-4">
          <button
            onClick={() => signOut({ callbackUrl: '/' })}
            className="text-gray-400 hover:text-white transition-colors text-sm"
          >
            Log Out
          </button>
        </div>

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
