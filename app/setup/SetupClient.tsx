'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { signOut } from 'next-auth/react'
import { PlaylistSearch } from '@/src/components/setup/PlaylistSearch'
import { TeamSetup } from '@/src/components/setup/TeamSetup'
import { useGameStore } from '@/src/store/gameStore'
import type { SpotifyPlaylist } from '@/src/lib/spotify/types'
import type { Team } from '@/src/store/gameStore'

const TEAM_COLORS = [
  '#00D9FF', // electric-blue
  '#FF007A', // hot-magenta
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
  const searchParams = useSearchParams()
  const persistedPlaylist = useGameStore((state) => state.playlist)
  const persistedTeams = useGameStore((state) => state.teams)
  const gameHistory = useGameStore((state) => state.gameHistory)
  const getTeamStats = useGameStore((state) => state.getTeamStats)
  const [selectedPlaylist, setSelectedPlaylist] = useState<SpotifyPlaylist | null>(null)
  const [showContinue, setShowContinue] = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  const [showTeamSetup, setShowTeamSetup] = useState(false)
  const setPlaylist = useGameStore((state) => state.setPlaylist)
  const setTeams = useGameStore((state) => state.setTeams)
  const setupTouchZones = useGameStore((state) => state.setupTouchZones)
  const router = useRouter()

  // Get unique team names from history
  const uniqueTeamNames = Array.from(
    new Set(gameHistory.flatMap(game => game.teams.map(t => t.name)))
  )

  // Check for team setup query parameter
  useEffect(() => {
    if (searchParams.get('teams') === 'new') {
      setShowTeamSetup(true)
      setShowContinue(false)
    }
  }, [searchParams])

  // Check if we have existing game setup
  useEffect(() => {
    if (persistedPlaylist && persistedTeams.length > 0 && searchParams.get('teams') !== 'new') {
      setShowContinue(true)
      setSelectedPlaylist(persistedPlaylist)
    }
  }, [persistedPlaylist, persistedTeams, searchParams])

  const handlePlaylistSelect = (playlist: SpotifyPlaylist) => {
    setSelectedPlaylist(playlist)
  }

  const handleStartGame = () => {
    if (selectedPlaylist) {
      // Set playlist
      setPlaylist(selectedPlaylist)

      // Only auto-generate teams if none exist
      if (persistedTeams.length === 0) {
        const teams = generateRandomTeams()
        setTeams(teams)
      }
      setupTouchZones()

      // Navigate directly to game
      router.push('/game')
    }
  }

  return (
    <div className="relative min-h-screen cassette-gradient p-8 overflow-hidden">
      {/* Scan lines overlay */}
      <div className="retro-scanlines absolute inset-0" />

      <div className="relative z-10 max-w-4xl mx-auto">
        <div className="flex justify-end mb-4">
          <button
            onClick={() => signOut({ callbackUrl: '/' })}
            className="text-gray-300 hover:text-white transition-colors text-sm"
            style={{ fontFamily: 'var(--font-geist-sans)' }}
          >
            Log Out
          </button>
        </div>

        <h1
          className="text-4xl md:text-5xl font-bold text-white mb-2 neon-text"
          style={{ fontFamily: 'var(--font-audiowide)' }}
        >
          GAME SETUP
        </h1>
        <p
          className="text-gray-300 mb-8 text-lg"
          style={{ fontFamily: 'var(--font-righteous)' }}
        >
          Select a playlist to use for the quiz
        </p>

        {/* Game Rules Info Box */}
        <div className="mb-8 bg-gray-800/80 border border-gray-700 rounded-lg p-6">
          <div className="flex items-start gap-3 mb-3">
            <span className="text-2xl">ℹ️</span>
            <h2
              className="text-xl font-bold text-white"
              style={{ fontFamily: 'var(--font-righteous)' }}
            >
              How to Play
            </h2>
          </div>
          <div className="space-y-2 text-gray-300">
            <p className="flex items-start gap-2">
              <span className="text-green-400 font-bold mt-1">🎯</span>
              <span><span className="text-white font-semibold">Win Condition:</span> First team to reach <span className="text-yellow-400 font-bold">10 points</span> wins!</span>
            </p>
            <p className="flex items-start gap-2">
              <span className="text-green-400 font-bold mt-1">✅</span>
              <span><span className="text-white font-semibold">Correct Answer:</span> <span className="text-green-400 font-bold">+1 point</span></span>
            </p>
            <p className="flex items-start gap-2">
              <span className="text-red-400 font-bold mt-1">❌</span>
              <span><span className="text-white font-semibold">Wrong Answer:</span> <span className="text-red-400 font-bold">-1 point</span> (minimum 0)</span>
            </p>
            <p className="flex items-start gap-2">
              <span className="text-blue-400 font-bold mt-1">🎵</span>
              <span><span className="text-white font-semibold">Fallback:</span> If all tracks are played before anyone reaches 10 points, highest score wins</span>
            </p>
          </div>
        </div>

        {gameHistory.length > 0 && (
          <div className="mb-8">
            <button
              onClick={() => setShowHistory(!showHistory)}
              className="w-full bg-gray-800/80 hover:bg-gray-700/80 border border-gray-700 rounded-lg p-4 transition-colors flex justify-between items-center"
            >
              <span
                className="text-white font-bold text-lg"
                style={{ fontFamily: 'var(--font-righteous)' }}
              >
                📊 Game History ({gameHistory.length} games)
              </span>
              <span className="text-gray-400">{showHistory ? '▼' : '▶'}</span>
            </button>

            {showHistory && (
              <div className="mt-4 bg-gray-800/80 border border-gray-700 rounded-lg p-6">
                {/* Team Statistics */}
                {uniqueTeamNames.length > 0 && (
                  <div className="mb-6">
                    <h3
                      className="text-xl font-bold text-white mb-4"
                      style={{ fontFamily: 'var(--font-righteous)' }}
                    >
                      Team Statistics
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {uniqueTeamNames.map(teamName => {
                        const stats = getTeamStats(teamName)
                        const winRate = stats.totalGames > 0
                          ? ((stats.wins / stats.totalGames) * 100).toFixed(0)
                          : 0

                        return (
                          <div key={teamName} className="bg-gray-700/60 border border-gray-600 rounded-lg p-4">
                            <div className="text-lg font-bold text-white mb-2">{teamName}</div>
                            <div className="grid grid-cols-2 gap-2 text-sm">
                              <div className="text-gray-400">Games:</div>
                              <div className="text-white font-semibold">{stats.totalGames}</div>

                              <div className="text-gray-400">Wins:</div>
                              <div className="text-green-400 font-semibold">{stats.wins}</div>

                              <div className="text-gray-400">Losses:</div>
                              <div className="text-red-400 font-semibold">{stats.losses}</div>

                              <div className="text-gray-400">Win Rate:</div>
                              <div className="text-yellow-400 font-semibold">{winRate}%</div>

                              <div className="text-gray-400">Avg Score:</div>
                              <div className="text-blue-400 font-semibold">{stats.averageScore.toFixed(1)}</div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}

                {/* Recent Games */}
                <div>
                  <h3
                    className="text-xl font-bold text-white mb-4"
                    style={{ fontFamily: 'var(--font-righteous)' }}
                  >
                    Recent Games
                  </h3>
                  <div className="space-y-3">
                    {gameHistory.slice(0, 10).map((game) => (
                      <div key={game.id} className="bg-gray-700/60 border border-gray-600 rounded-lg p-4">
                        <div className="flex justify-between items-start mb-2">
                          <div className="text-white font-semibold">{game.playlistName}</div>
                          <div className="flex gap-2 items-center">
                            {game.endReason === 'score_limit' && (
                              <span className="text-xs bg-yellow-500/20 text-yellow-400 px-2 py-1 rounded font-semibold">
                                10 PTS WIN
                              </span>
                            )}
                            {game.endReason === 'tracks_exhausted' && (
                              <span className="text-xs bg-blue-500/20 text-blue-400 px-2 py-1 rounded">
                                All Tracks
                              </span>
                            )}
                            <div className="text-xs text-gray-400">
                              {new Date(game.date).toLocaleDateString()}
                            </div>
                          </div>
                        </div>
                        <div className="text-sm text-gray-300 mb-2">
                          {game.teams.map((team, idx) => (
                            <span key={team.name}>
                              <span className={team.name === game.winner ? 'text-yellow-400 font-bold' : ''}>
                                {team.name}
                              </span>
                              {': '}
                              <span className="font-semibold">{team.score}</span>
                              {idx < game.teams.length - 1 && ' vs '}
                            </span>
                          ))}
                        </div>
                        <div className="text-xs text-green-400">
                          Winner: {game.winner} 🏆
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {showContinue && (
          <div className="mb-8 p-6 bg-gray-800/80 border border-gray-700 rounded-lg">
            <h2
              className="text-2xl font-bold text-white mb-4"
              style={{ fontFamily: 'var(--font-righteous)' }}
            >
              Continue Previous Game?
            </h2>
            <p className="text-gray-300 mb-4">
              Playlist: <span className="text-green-400">{persistedPlaylist?.name}</span>
            </p>
            <p className="text-gray-300 mb-6">
              Teams: <span className="text-green-400">{persistedTeams.map(t => t.name).join(', ')}</span>
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setupTouchZones()
                  router.push('/game')
                }}
                className="text-white font-bold py-3 px-8 rounded-full transition-all duration-300 transform hover:scale-105 flex-1"
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
                Continue Game
              </button>
              <button
                onClick={() => {
                  setShowContinue(false)
                  setTeams([])
                  setPlaylist(null)
                  setShowTeamSetup(true)
                }}
                className="text-white font-bold py-3 px-8 rounded-full transition-colors flex-1 bg-gray-600/80 hover:bg-gray-700/80 border border-gray-600"
                style={{ fontFamily: 'var(--font-righteous)' }}
              >
                New Game
              </button>
            </div>
          </div>
        )}

        {persistedTeams.length > 0 && !persistedPlaylist && !showContinue && (
          <div className="mb-8 p-6 bg-gray-800/80 rounded-lg border-2 border-neon-pink/30">
            <h2
              className="text-2xl font-bold text-white mb-4"
              style={{ fontFamily: 'var(--font-righteous)' }}
            >
              Teams Ready!
            </h2>
            <p className="text-gray-300 mb-2">
              <span className="text-green-400 font-bold">
                {persistedTeams.map(t => t.name).join(' vs ')}
              </span>
            </p>
            <p className="text-gray-400 mb-6 text-sm">
              Select a playlist below to start a new game with these teams.
            </p>
            <button
              onClick={() => setShowTeamSetup(true)}
              className="bg-gray-600/80 hover:bg-gray-700/80 border border-gray-600 text-white font-bold py-2 px-6 rounded-full transition-colors text-sm"
              style={{ fontFamily: 'var(--font-righteous)' }}
            >
              New Teams
            </button>
          </div>
        )}

        {showTeamSetup && (
          <TeamSetup onComplete={() => {
            setShowTeamSetup(false)
          }} />
        )}

        {!showContinue && !showTeamSetup && (
          <>
            {/* Only show Configure Teams button if Teams Ready section isn't showing */}
            {!(persistedTeams.length > 0 && !persistedPlaylist) && (
              <div className="mb-6 flex justify-center">
                <button
                  onClick={() => setShowTeamSetup(true)}
                  className="bg-gray-600/80 hover:bg-gray-700/80 border border-gray-600 text-white font-bold py-3 px-8 rounded-full transition-colors"
                  style={{ fontFamily: 'var(--font-righteous)' }}
                >
                  Configure Teams
                </button>
              </div>
            )}

            <PlaylistSearch accessToken={accessToken} onSelect={handlePlaylistSelect} />

            {selectedPlaylist && (
              <div className="mt-8 flex justify-center">
                <button
                  onClick={handleStartGame}
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
