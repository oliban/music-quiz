'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { signOut } from 'next-auth/react'
import { PlaylistSearch } from '@/src/components/setup/PlaylistSearch'
import { useGameStore } from '@/src/store/gameStore'
import type { SpotifyPlaylist } from '@/src/lib/spotify/types'
import type { Team } from '@/src/store/gameStore'

const TEAM_COLORS = [
  '#3B82F6', // blue
  '#EF4444', // red
]

const TEAM_NAME_SUGGESTIONS = [
  'The Beatlemaniacs',
  'Disco Inferno',
  'Rhythm Rebels',
  'The Headbangers',
  'Karaoke Kings',
  'Vinyl Villains',
  'The Showstoppers',
  'Bass Droppers',
  'Treble Makers',
  'The Mixtapes',
  'Acoustic Chaos',
  'The Earworms',
  'Playlist Pirates',
  'The Crescendos',
  'Dancing Queens',
  'The One-Hit Wonders',
  'Rockstars Anonymous',
  'The Jukebox Heroes',
  'Pitch Perfect',
  'The Garage Band',
  'Music Nerds Unite',
  'The Sound Waves',
  'Party Animals',
  'The Song Birds',
  'Freestyle Fanatics',
  'The Chart Toppers',
  'Melody Makers',
  'The Groove Squad',
  'Harmony Hooligans',
  'The Backstreet Bois',
  'Lyric Legends',
  'The Track Stars',
  'Amp It Up',
  'The Riff Raff',
  'Shower Singers',
  'The Note-orious',
  'Decibel Rebels',
  'The Tune Squad',
  'Rhythm & Booze',
  'The Falsetto Fiends',
  'Song Slayers',
  'The Beat Freaks',
  'Air Guitar Heroes',
  'The Volume Knobs',
  'Kazoo Crew',
  'The Track Attackers',
  'Festival Fanatics',
  'The Mosh Pit',
  'Spotify Stalkers',
  'The Playlist Pros',
]

const BUZZER_SOUNDS = [
  '/sounds/automobile-horn.mp3',
  '/sounds/bell-ring.mp3',
  '/sounds/bell.mp3',
  '/sounds/boat-horn.mp3',
  '/sounds/short-ah-yell.mp3',
  '/sounds/short-horn.mp3',
]

function getRandomTeamNames(count: number): string[] {
  const shuffled = [...TEAM_NAME_SUGGESTIONS].sort(() => Math.random() - 0.5)
  return shuffled.slice(0, count)
}

function getRandomSounds(count: number): string[] {
  const shuffled = [...BUZZER_SOUNDS].sort(() => Math.random() - 0.5)
  return shuffled.slice(0, count)
}

function generateRandomTeams(): Team[] {
  const names = getRandomTeamNames(2)
  const sounds = getRandomSounds(2)

  return names.map((name, index) => ({
    id: `team-${index + 1}`,
    name,
    score: 0,
    color: TEAM_COLORS[index],
    buzzerSound: sounds[index],
  }))
}

interface SetupClientProps {
  accessToken: string
}

export function SetupClient({ accessToken }: SetupClientProps) {
  const persistedPlaylist = useGameStore((state) => state.playlist)
  const persistedTeams = useGameStore((state) => state.teams)
  const [selectedPlaylist, setSelectedPlaylist] = useState<SpotifyPlaylist | null>(null)
  const [showContinue, setShowContinue] = useState(false)
  const setPlaylist = useGameStore((state) => state.setPlaylist)
  const setTeams = useGameStore((state) => state.setTeams)
  const setupTouchZones = useGameStore((state) => state.setupTouchZones)
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

  const handleStartGame = () => {
    if (selectedPlaylist) {
      // Set playlist
      setPlaylist(selectedPlaylist)

      // Auto-generate random teams
      const teams = generateRandomTeams()
      setTeams(teams)
      setupTouchZones()

      // Navigate directly to game
      router.push('/game')
    }
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
                  onClick={handleStartGame}
                  className="bg-green-500 hover:bg-green-600 text-white font-bold py-4 px-12 rounded-full text-lg transition-colors"
                >
                  Let's play!
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
