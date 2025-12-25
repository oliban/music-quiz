'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { signOut } from 'next-auth/react'
import confetti from 'canvas-confetti'
import { useGameStore } from '@/src/store/gameStore'
import { TwofoldText } from '@/src/components/game/TwofoldText'
import { TouchZones } from '@/src/components/game/TouchZones'
import { DraggableAnswer } from '@/src/components/game/DraggableAnswer'
import { ScoreBoard } from '@/src/components/game/ScoreBoard'
import { DualZoneLayout } from '@/src/components/game/DualZoneLayout'
import { TeamZoneContent } from '@/src/components/game/TeamZoneContent'
import { AlbumArtDisplay } from '@/src/components/game/AlbumArtDisplay'
import { QuestionGenerator } from '@/src/lib/game/questionGenerator'
import { SpotifyClient } from '@/src/lib/spotify/api'
import type { SpotifyTrack } from '@/src/lib/spotify/types'
import type { GameQuestion } from '@/src/store/gameStore'

interface GameClientProps {
  accessToken: string
}

export function GameClient({ accessToken }: GameClientProps) {
  const router = useRouter()
  const playlist = useGameStore((state) => state.playlist)
  const teams = useGameStore((state) => state.teams)
  const touchZones = useGameStore((state) => state.touchZones)
  const [audioLoaded, setAudioLoaded] = useState(false)
  const [tracks, setTracks] = useState<SpotifyTrack[]>([])
  const [currentQuestion, setCurrentQuestion] = useState<GameQuestion | null>(null)
  const [gameStarted, setGameStarted] = useState(false)
  const [questionIndex, setQuestionIndex] = useState(0)
  const [loading, setLoading] = useState(false)
  const [answeredCorrectly, setAnsweredCorrectly] = useState(false)
  const [playerReady, setPlayerReady] = useState(false)
  const [gameCompleted, setGameCompleted] = useState(false)
  const [buzzedTeam, setBuzzedTeam] = useState<string | null>(null)
  const [showAnswerPrompt, setShowAnswerPrompt] = useState(false)
  const [disqualifiedTeams, setDisqualifiedTeams] = useState<Set<string>>(new Set())
  const [isPlaying, setIsPlaying] = useState(false)
  const [shuffleMode, setShuffleMode] = useState(true)
  const [playedTrackIndices, setPlayedTrackIndices] = useState<Set<number>>(new Set())
  const [celebratingTeam, setCelebratingTeam] = useState<string | null>(null)
  const [showNoAnswerDialog, setShowNoAnswerDialog] = useState(false)
  const [showAlbumArt, setShowAlbumArt] = useState(false)
  const questionGeneratorRef = useRef<QuestionGenerator | null>(null)
  const zoneRefs = useRef<Map<string, DOMRect>>(new Map())
  const playerRef = useRef<any>(null)
  const deviceIdRef = useRef<string | null>(null)
  const hasAnswerRef = useRef(false)

  useEffect(() => {
    if (!playlist || teams.length === 0) {
      router.push('/setup')
    }
  }, [playlist, teams, router])

  // Initialize Spotify Web Playback SDK
  useEffect(() => {
    if (typeof window === 'undefined') return

    // Load SDK dynamically
    const loadSpotifySDK = () => {
      if (document.querySelector('script[src="https://sdk.scdn.co/spotify-player.js"]')) {
        // Already loaded
        return
      }

      const script = document.createElement('script')
      script.src = 'https://sdk.scdn.co/spotify-player.js'
      script.async = true
      document.body.appendChild(script)
    }

    const initializePlayer = () => {
      if (!window.Spotify) {
        console.warn('⚠️ Spotify SDK not loaded yet')
        return
      }

      const player = new window.Spotify.Player({
        name: 'Music Quiz Game',
        getOAuthToken: (cb: (token: string) => void) => {
          cb(accessToken)
        },
        volume: 0.8
      })

      // Player ready
      player.addListener('ready', ({ device_id }: { device_id: string }) => {
        console.log('✅ Spotify Player Ready! Device ID:', device_id)
        deviceIdRef.current = device_id
        setPlayerReady(true)
      })

      // Player errors
      player.addListener('initialization_error', ({ message }: { message: string }) => {
        console.error('❌ Initialization Error:', message)
      })

      player.addListener('authentication_error', ({ message }: { message: string }) => {
        console.error('❌ Authentication Error:', message)
      })

      player.addListener('account_error', ({ message }: { message: string }) => {
        console.error('❌ Account Error: This requires Spotify Premium', message)
      })

      // Track state changes (to detect when song ends)
      player.addListener('player_state_changed', (state: any) => {
        if (!state) return

        setIsPlaying(!state.paused)

        // Check if track ended - Spotify sets position to 0 when track finishes
        if (state.paused && state.position === 0 && state.duration > 0) {
          console.log('Track ended')
          // Check if no one has answered yet (using ref to avoid stale closure)
          if (!hasAnswerRef.current) {
            console.log('Track ended with no answer - showing continue dialog')
            setShowNoAnswerDialog(true)
          }
        }
      })

      player.connect()
      playerRef.current = player
    }

    // Load the SDK
    loadSpotifySDK()

    // Check if SDK is already loaded
    if (window.Spotify) {
      initializePlayer()
    } else {
      // Set up callback for when SDK loads
      window.onSpotifyWebPlaybackSDKReady = initializePlayer
    }

    return () => {
      if (playerRef.current) {
        playerRef.current.disconnect()
      }
    }
  }, [accessToken])

  // Load tracks when component mounts
  useEffect(() => {
    async function loadTracks() {
      if (!playlist) return

      setLoading(true)
      try {
        const client = new SpotifyClient(accessToken)
        const playlistTracks = await client.getPlaylistTracks(playlist.id)
        setTracks(playlistTracks)

        // Initialize question generator
        questionGeneratorRef.current = new QuestionGenerator({
          tracks: playlistTracks,
          lastFmApiKey: process.env.NEXT_PUBLIC_LASTFM_API_KEY
        })
      } catch (error) {
        console.error('Failed to load tracks:', error)
      } finally {
        setLoading(false)
      }
    }

    loadTracks()
  }, [playlist, accessToken])

  const handleStartGame = async () => {
    if (!questionGeneratorRef.current || tracks.length === 0) return

    setGameStarted(true)
    await generateNextQuestion()
  }

  const generateNextQuestion = async () => {
    if (!questionGeneratorRef.current) return

    // Check if game is over
    if (playedTrackIndices.size >= tracks.length) {
      // All tracks played - game over
      setCurrentQuestion(null)
      setGameStarted(false)
      setGameCompleted(true)

      // Stop audio
      if (playerRef.current) {
        playerRef.current.pause()
      }
      return
    }

    // Get next track index
    let trackIndex: number
    if (shuffleMode) {
      // Pick random unplayed track
      const unplayedIndices = tracks
        .map((_, i) => i)
        .filter(i => !playedTrackIndices.has(i))
      trackIndex = unplayedIndices[Math.floor(Math.random() * unplayedIndices.length)]
    } else {
      // Sequential mode
      trackIndex = questionIndex
      if (playedTrackIndices.has(trackIndex)) {
        // Already played this track, game should be over
        setCurrentQuestion(null)
        setGameStarted(false)
        setGameCompleted(true)
        if (playerRef.current) {
          playerRef.current.pause()
        }
        return
      }
    }

    // Mark track as played
    setPlayedTrackIndices(prev => new Set([...prev, trackIndex]))

    const track = tracks[trackIndex]
    const question = await questionGeneratorRef.current.generateQuestion(track, trackIndex)
    setCurrentQuestion(question)
    setAnsweredCorrectly(false)
    setBuzzedTeam(null)
    setShowAnswerPrompt(false)
    setShowNoAnswerDialog(false)
    setShowAlbumArt(false)
    setDisqualifiedTeams(new Set())
    hasAnswerRef.current = false

    // Play full song using Spotify Web Playback SDK
    if (playerReady && deviceIdRef.current && track.uri) {
      await playTrack(track.uri)
    } else {
      console.warn('⚠️ Spotify Player not ready yet. Click "Play Audio" when ready.')
    }
  }

  const playTrack = async (trackUri: string) => {
    if (!deviceIdRef.current) {
      console.error('No device ID available')
      return
    }

    try {
      // Use Spotify Web API to start playback on our device
      const response = await fetch(`https://api.spotify.com/v1/me/player/play?device_id=${deviceIdRef.current}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          uris: [trackUri]
        })
      })

      if (response.ok || response.status === 204) {
        console.log('🎵 Now playing full song!')
        setIsPlaying(true)
      } else {
        const error = await response.json()
        console.error('❌ Playback error details:')
        console.error('  Status:', response.status)
        console.error('  Error object:', JSON.stringify(error, null, 2))
        console.error('  Error message:', error?.error?.message || 'No message')
        console.error('  Error reason:', error?.error?.reason || 'No reason')

        if (response.status === 404 && error?.error?.message === 'Device not found') {
          console.warn('⚠️ Device expired/not found - this is normal during development with hot reload')
          console.warn('💡 Click "Play Audio" button to start playback manually')
          setIsPlaying(false)
        } else if (response.status === 403) {
          console.error('⚠️ 403 Forbidden - Possible causes:')
          console.error('  1. Token scopes missing (should have: streaming, user-modify-playback-state)')
          console.error('  2. Device not properly activated')
          console.error('  3. Account restrictions (region, family plan, etc.)')
          console.error('  4. Try: Revoke access at spotify.com/account/apps, then log back in')
        }
      }
    } catch (error) {
      console.error('Failed to start playback:', error)
    }
  }

  const handleAnswerDrag = (answer: string, x: number, y: number, draggingTeamId: string) => {
    if (!currentQuestion || currentQuestion.type !== 'drag-to-corner' || answeredCorrectly) return

    // Check ALL zones to see where the answer was dropped
    let droppedOnZone: string | null = null
    let droppedOnTeamId: string | null = null

    for (const zone of touchZones) {
      const rect = zoneRefs.current.get(zone.id)
      if (rect && x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom) {
        droppedOnZone = zone.id
        droppedOnTeamId = zone.teamId
        break
      }
    }

    if (droppedOnTeamId) {
      const team = teams.find(t => t.id === droppedOnTeamId)

      // Check if team is disqualified
      if (disqualifiedTeams.has(droppedOnTeamId)) {
        console.log(`${team?.name} is disqualified - cannot answer this question`)
        return
      }

      const isCorrect = answer === currentQuestion.correctAnswer

      console.log(`Answer "${answer}" dropped on ${team?.name}'s corner`)
      console.log(`Correct answer: ${currentQuestion.correctAnswer}`)
      console.log(`Is correct: ${isCorrect}`)

      if (isCorrect) {
        setAnsweredCorrectly(true)
        hasAnswerRef.current = true
        setShowAlbumArt(true)
        useGameStore.getState().updateScore(droppedOnTeamId, 1)
        console.log(`${team?.name} earned 1 point!`)
        celebrate(droppedOnTeamId)

        // Advance to next question after a delay
        setTimeout(() => {
          handleNextQuestion()
        }, 4000) // 4 seconds to see album art
      } else {
        // Disqualify the team from trying again
        const newDisqualified = new Set([...disqualifiedTeams, droppedOnTeamId])
        setDisqualifiedTeams(newDisqualified)
        console.log(`Wrong answer! ${team?.name} is now disqualified from this question.`)

        // Check if all teams are now disqualified
        if (newDisqualified.size === teams.length) {
          console.log('All teams disqualified - showing album art and advancing')
          setShowAlbumArt(true)
          setTimeout(() => {
            handleNextQuestion()
          }, 4000) // 4 seconds to see album art
        }
      }
    }
  }

  const handleNextQuestion = async () => {
    setQuestionIndex((prev) => prev + 1)
    setIsPlaying(false)

    // Stop current audio
    if (playerRef.current) {
      playerRef.current.pause()
    }

    // Wait a bit before showing next question
    setTimeout(() => {
      generateNextQuestion()
    }, 500)
  }

  const handlePlayAudio = async () => {
    if (currentQuestion && playerReady && currentQuestion.track.uri) {
      await playTrack(currentQuestion.track.uri)
    }
  }

  const handleStopAudio = () => {
    if (playerRef.current) {
      playerRef.current.pause()
    }
  }

  const handleRematch = () => {
    // Reset game state but keep teams and playlist
    setQuestionIndex(0)
    setGameStarted(false)
    setGameCompleted(false)
    setCurrentQuestion(null)
    setAnsweredCorrectly(false)
    setPlayedTrackIndices(new Set())

    // Reset all team scores to 0
    teams.forEach(team => {
      useGameStore.getState().updateScore(team.id, -team.score)
    })
  }

  const handleNewGame = () => {
    router.push('/setup')
  }

  const celebrate = (teamId: string) => {
    const team = teams.find(t => t.id === teamId)
    if (!team) return

    // Find the team's zone position
    const zone = touchZones.find(z => z.teamId === teamId)
    if (!zone) return

    // Set celebrating state for visual effects
    setCelebratingTeam(teamId)
    setTimeout(() => setCelebratingTeam(null), 3000)

    // Convert hex color to RGB for confetti
    const hex = team.color.replace('#', '')
    const r = parseInt(hex.substr(0, 2), 16)
    const g = parseInt(hex.substr(2, 2), 16)
    const b = parseInt(hex.substr(4, 2), 16)

    // Create confetti burst with team colors (base color, lighter shade, and white)
    const colors = [
      `rgb(${r}, ${g}, ${b})`,
      `rgb(${Math.min(r + 40, 255)}, ${Math.min(g + 40, 255)}, ${Math.min(b + 40, 255)})`,
      '#FFFFFF', // White
    ]

    // Map zone position to confetti direction
    const confettiConfig: Record<string, { origin: { x: number; y: number }; angle: number }> = {
      'top-left': { origin: { x: 0, y: 0 }, angle: 315 },
      'top-right': { origin: { x: 1, y: 0 }, angle: 225 },
      'bottom-left': { origin: { x: 0, y: 1 }, angle: 45 },
      'bottom-right': { origin: { x: 1, y: 1 }, angle: 135 },
      'center-top': { origin: { x: 0.5, y: 0 }, angle: 270 },
      'center-bottom': { origin: { x: 0.5, y: 1 }, angle: 90 },
      'left-middle': { origin: { x: 0, y: 0.5 }, angle: 0 },
      'right-middle': { origin: { x: 1, y: 0.5 }, angle: 180 },
    }

    const config = confettiConfig[zone.position]
    if (!config) return

    // Multiple confetti bursts for celebration
    const duration = 2000
    const end = Date.now() + duration

    const frame = () => {
      confetti({
        particleCount: 5,
        angle: config.angle,
        spread: 60,
        origin: config.origin,
        colors: colors,
      })

      if (Date.now() < end) {
        requestAnimationFrame(frame)
      }
    }
    frame()
  }

  const handleHasAnswered = (answered: boolean) => {
    if (!answered) {
      // Team didn't answer - clear buzzer and let other teams try
      setBuzzedTeam(null)
      setShowAnswerPrompt(false)
      // Restart music
      if (currentQuestion && playerReady && currentQuestion.track.uri) {
        playTrack(currentQuestion.track.uri)
      }
      return
    }

    // Team has answered - show the judgment prompt
    setShowAnswerPrompt(true)
  }

  const handleBuzzCorrect = () => {
    if (!buzzedTeam) return

    // Award points and celebrate!
    hasAnswerRef.current = true
    setShowAlbumArt(true)
    useGameStore.getState().updateScore(buzzedTeam, 1)
    const team = teams.find(t => t.id === buzzedTeam)
    console.log(`${team?.name} earned 1 point!`)
    celebrate(buzzedTeam)

    // Clear buzzer and advance
    setBuzzedTeam(null)
    setShowAnswerPrompt(false)
    setAnsweredCorrectly(true)
    setTimeout(() => {
      handleNextQuestion()
    }, 4000) // 4 seconds to see album art
  }

  const handleBuzzIncorrect = () => {
    // No points awarded
    hasAnswerRef.current = true
    setShowAlbumArt(true)
    const team = teams.find(t => t.id === buzzedTeam)
    console.log(`${team?.name} got it wrong - no points awarded`)

    // Clear buzzer and advance
    setBuzzedTeam(null)
    setShowAnswerPrompt(false)
    setTimeout(() => {
      handleNextQuestion()
    }, 4000) // 4 seconds to see album art
  }

  const handleNoAnswerContinue = () => {
    console.log('No answer given - moving to next question')
    setShowNoAnswerDialog(false)
    handleNextQuestion()
  }

  const handleZoneTouch = (zoneId: string) => {
    if (!currentQuestion) return

    // Zone touches only work for buzz-in questions, not multiple choice
    if (currentQuestion.type !== 'buzz-in') return

    const zone = touchZones.find((z) => z.id === zoneId)
    if (!zone) return

    const team = teams.find((t) => t.id === zone.teamId)
    if (!team) return

    console.log(`Team ${team.name} touched zone ${zoneId}`)

    // For buzz-in, first team to touch gets to answer
    if (!buzzedTeam) {
      setBuzzedTeam(team.id)
      setIsPlaying(false)
      console.log(`${team.name} buzzed in! Stopping music...`)

      // Stop the music
      if (playerRef.current) {
        playerRef.current.pause()
      }
    }
  }

  if (!playlist || teams.length === 0) {
    return <div className="min-h-screen bg-black flex items-center justify-center text-white">Loading...</div>
  }

  return (
    <div className="min-h-screen bg-black relative overflow-hidden">
      {/* Logout button */}
      <button
        onClick={() => signOut({ callbackUrl: '/' })}
        className="absolute top-4 right-4 z-50 text-gray-400 hover:text-white transition-colors text-xs bg-black/50 px-3 py-1 rounded"
      >
        Log Out
      </button>

      {/* Touch zones */}
      <TouchZones
        zones={touchZones}
        teams={teams}
        disqualifiedTeams={disqualifiedTeams}
        celebratingTeam={celebratingTeam}
        onZoneTouch={handleZoneTouch}
        onZoneMount={(zoneId, rect) => {
          zoneRefs.current.set(zoneId, rect)
        }}
      />

      {/* Scoreboards on opposite sides (not blocking corners) */}
      {gameStarted && (
        <>
          {/* Top scoreboard (offset from right edge to avoid corner, rotated) */}
          <div className="absolute top-4 right-40 z-40">
            <ScoreBoard teams={teams} rotated />
          </div>
          {/* Bottom scoreboard (offset from left edge to avoid corner) */}
          <div className="absolute bottom-4 left-40 z-40">
            <ScoreBoard teams={teams} />
          </div>
        </>
      )}

      {/* Main content with dual-zone layout */}
      <div className="absolute inset-0 pointer-events-none">
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-auto">
            <TwofoldText className="text-white text-xl">
              Loading tracks...
            </TwofoldText>
          </div>
        )}

        {!loading && !gameStarted && !gameCompleted && tracks.length > 0 && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-auto">
            <div className="max-w-2xl w-full p-8">
              <TwofoldText className="text-3xl font-bold text-white mb-8">
                {playlist.name}
              </TwofoldText>
              <div className="mb-6 bg-gray-800 p-4 rounded-xl">
                <div className="text-white text-lg mb-3 text-center">Play Order</div>
                <div className="flex gap-3">
                  <button
                    onClick={() => setShuffleMode(true)}
                    className={`flex-1 py-3 px-4 rounded-lg font-bold transition-colors ${
                      shuffleMode
                        ? 'bg-green-500 text-white'
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }`}
                  >
                    🔀 Shuffle
                  </button>
                  <button
                    onClick={() => setShuffleMode(false)}
                    className={`flex-1 py-3 px-4 rounded-lg font-bold transition-colors ${
                      !shuffleMode
                        ? 'bg-green-500 text-white'
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }`}
                  >
                    📋 In Order
                  </button>
                </div>
              </div>
              <button
                onClick={handleStartGame}
                className="bg-green-500 hover:bg-green-600 text-white font-bold py-4 px-12 rounded-full text-2xl transition-colors w-full"
              >
                Start Game
              </button>
              <TwofoldText className="text-gray-400 mt-4 text-sm">
                {tracks.length} tracks loaded
              </TwofoldText>
            </div>
          </div>
        )}

        {gameCompleted && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-auto">
            <div className="max-w-2xl w-full p-8">
              <TwofoldText className="text-4xl font-bold text-yellow-400 mb-8">
                Game Over!
              </TwofoldText>

              {/* Final Scores */}
              <div className="mb-8">
                <TwofoldText className="text-2xl font-bold text-white mb-4">
                  Final Scores
                </TwofoldText>
                <div className="grid grid-cols-1 gap-4">
                  {teams
                    .sort((a, b) => b.score - a.score)
                    .map((team, index) => (
                      <TwofoldText
                        key={team.id}
                        className={`p-4 rounded-lg ${
                          index === 0 ? 'bg-yellow-600' : 'bg-gray-800'
                        }`}
                      >
                        <span className="text-2xl mr-3">
                          {index === 0 ? '🏆' : `${index + 1}.`}
                        </span>
                        <span className="font-bold" style={{ color: team.color }}>
                          {team.name}:
                        </span>
                        <span className="text-white ml-2 text-xl">{team.score} pts</span>
                      </TwofoldText>
                    ))}
                </div>
              </div>

              {/* Winner Announcement */}
              {teams.length > 0 && (
                <TwofoldText className="text-3xl font-bold text-green-400 mb-8">
                  {teams.sort((a, b) => b.score - a.score)[0].name} wins! 🎉
                </TwofoldText>
              )}

              {/* Action Buttons */}
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={handleRematch}
                  className="bg-green-500 hover:bg-green-600 text-white font-bold py-4 px-8 rounded-full text-lg transition-colors"
                >
                  Rematch
                </button>
                <button
                  onClick={handleNewGame}
                  className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-4 px-8 rounded-full text-lg transition-colors"
                >
                  New Game
                </button>
              </div>
            </div>
          </div>
        )}

        {gameStarted && currentQuestion && (
          <DualZoneLayout
            upperContent={
              <TeamZoneContent
                teams={[teams[0], ...(teams[2] ? [teams[2]] : [])]}
                currentQuestion={currentQuestion}
                answeredCorrectly={answeredCorrectly}
                onAnswerDrag={handleAnswerDrag}
                playedCount={playedTrackIndices.size}
                totalTracks={tracks.length}
                buzzedTeam={buzzedTeam}
                isRotated={true}
              />
            }
            centerContent={
              <>
                {/* Play button - positioned to the left */}
                <div className="absolute left-8 top-1/2 -translate-y-1/2">
                  <button
                    onClick={handlePlayAudio}
                    className={`${
                      isPlaying
                        ? 'bg-green-500 hover:bg-green-600 active:bg-green-700'
                        : 'bg-blue-500 hover:bg-blue-600 active:bg-blue-700'
                    } text-white font-bold py-3 px-6 rounded-full transition-colors touch-manipulation shadow-lg`}
                  >
                    {isPlaying ? '🎵 Playing...' : '🎵 Play'}
                  </button>
                </div>

                {/* Album art when answer is revealed */}
                {showAlbumArt && currentQuestion && (
                  <AlbumArtDisplay track={currentQuestion.track} />
                )}

                {/* Dialogs - visible from both sides */}
                {/* Stage 1: Has the team answered? */}
                {currentQuestion.type === 'buzz-in' && buzzedTeam && !showAnswerPrompt && (
                  <div className="bg-gray-800/95 p-6 rounded-xl max-w-md mx-auto shadow-2xl border-2 border-white/30 backdrop-blur-sm">
                    <div className="text-2xl font-bold text-white mb-6 text-center">
                      Has {teams.find(t => t.id === buzzedTeam)?.name} answered?
                    </div>
                    <button
                      onClick={() => handleHasAnswered(true)}
                      className="w-full bg-green-500 hover:bg-green-600 active:bg-green-700 text-white font-bold py-4 px-8 rounded-full text-xl transition-colors touch-manipulation"
                    >
                      ✓ Yes
                    </button>
                  </div>
                )}

                {/* Stage 2: Was the answer correct? */}
                {currentQuestion.type === 'buzz-in' && buzzedTeam && showAnswerPrompt && (
                  <div className="bg-gray-800/95 p-6 rounded-xl max-w-md mx-auto shadow-2xl border-2 border-white/30 backdrop-blur-sm">
                    <div className="text-xl text-gray-300 mb-4 text-center">
                      Correct Answer: <span className="text-green-400 font-bold">{currentQuestion.correctAnswer}</span>
                    </div>
                    <div className="text-2xl font-bold text-white mb-6 text-center">
                      Did {teams.find(t => t.id === buzzedTeam)?.name} get the question right?
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <button
                        onClick={handleBuzzCorrect}
                        className="bg-green-500 hover:bg-green-600 active:bg-green-700 text-white font-bold py-4 px-6 rounded-full text-xl transition-colors touch-manipulation"
                      >
                        ✓ Yes
                      </button>
                      <button
                        onClick={handleBuzzIncorrect}
                        className="bg-red-500 hover:bg-red-600 active:bg-red-700 text-white font-bold py-4 px-6 rounded-full text-xl transition-colors touch-manipulation"
                      >
                        ✗ No
                      </button>
                    </div>
                  </div>
                )}

                {/* No answer dialog */}
                {showNoAnswerDialog && (
                  <div className="bg-gray-800/95 p-6 rounded-xl max-w-md mx-auto shadow-2xl border-2 border-white/30 backdrop-blur-sm">
                    <div className="text-xl text-gray-300 mb-4 text-center">
                      Correct Answer: <span className="text-green-400 font-bold">{currentQuestion.correctAnswer}</span>
                    </div>
                    <div className="text-2xl font-bold text-white mb-6 text-center">
                      Time's up! No one answered.
                    </div>
                    <button
                      onClick={handleNoAnswerContinue}
                      className="w-full bg-blue-500 hover:bg-blue-600 active:bg-blue-700 text-white font-bold py-4 px-8 rounded-full text-xl transition-colors touch-manipulation"
                    >
                      Continue
                    </button>
                  </div>
                )}
              </>
            }
            lowerContent={
              <TeamZoneContent
                teams={[teams[1] || teams[0], ...(teams[3] ? [teams[3]] : [])]}
                currentQuestion={currentQuestion}
                answeredCorrectly={answeredCorrectly}
                onAnswerDrag={handleAnswerDrag}
                playedCount={playedTrackIndices.size}
                totalTracks={tracks.length}
                buzzedTeam={buzzedTeam}
              />
            }
          />
        )}
      </div>
    </div>
  )
}
