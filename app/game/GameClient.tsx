'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { signOut } from 'next-auth/react'
import confetti from 'canvas-confetti'
import { useGameStore } from '@/src/store/gameStore'
import { TwofoldText } from '@/src/components/game/TwofoldText'
import { TouchZones } from '@/src/components/game/TouchZones'
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
  const [selectedWrongAnswer, setSelectedWrongAnswer] = useState<string | null>(null)
  const [wrongAnswerTeamId, setWrongAnswerTeamId] = useState<string | null>(null)
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
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const hasAnswerRef = useRef(false)
  const trackHasStartedRef = useRef(false)

  useEffect(() => {
    if (!playlist || teams.length === 0) {
      router.push('/setup')
    }
  }, [playlist, teams, router])

  // Initialize HTML5 Audio for all platforms (30-second previews)
  useEffect(() => {
    if (typeof window === 'undefined') return

    console.log('🔊 Initializing HTML5 audio player (30-second previews)')

    // Create HTML5 audio element
    const audio = new Audio()
    audioRef.current = audio

    // Audio event listeners
    audio.addEventListener('play', () => {
      console.log('▶️ Audio started playing')
      setIsPlaying(true)
      trackHasStartedRef.current = true
    })

    audio.addEventListener('pause', () => {
      console.log('⏸️ Audio paused')
      setIsPlaying(false)
    })

    audio.addEventListener('ended', () => {
      console.log('🏁 Audio ended')
      setIsPlaying(false)

      if (!hasAnswerRef.current) {
        // Wait for all options to reveal before showing dialog
        const maxDelay = currentQuestion?.optionRevealDelays
          ? Math.max(...currentQuestion.optionRevealDelays)
          : 0

        setTimeout(() => {
          console.log('Track ended with no answer - showing continue dialog')
          setShowNoAnswerDialog(true)
        }, maxDelay * 1000)
      }
    })

    audio.addEventListener('error', (e) => {
      const audioElement = e.target as HTMLAudioElement
      const error = audioElement.error

      // Ignore errors when there's no src (initialization) or empty src
      if (!audioElement.src || audioElement.src === window.location.href) {
        return
      }

      console.error('❌ Audio error:', error?.code, error?.message)
      setIsPlaying(false)
    })

    audio.addEventListener('timeupdate', () => {
      // Track that playback has started
      if (audio.currentTime > 0) {
        trackHasStartedRef.current = true
      }
    })

    setPlayerReady(true)
    console.log('✅ Audio player ready')

    return () => {
      audio.pause()
      audio.src = ''
    }
  }, [])

  // Load tracks when component mounts
  useEffect(() => {
    async function loadTracks() {
      if (!playlist) return

      setLoading(true)
      try {
        const client = new SpotifyClient(accessToken)
        let playlistTracks = await client.getPlaylistTracks(playlist.id)

        // Extract preview URLs for tracks without them (ALL PLATFORMS)
        console.log('🔍 Extracting preview URLs from embed player...')

        // Find tracks needing preview extraction
        const tracksNeedingPreviews = playlistTracks.filter(t => !t.preview_url)

        if (tracksNeedingPreviews.length > 0) {
          console.log(`🔍 Extracting previews for ${tracksNeedingPreviews.length} tracks...`)

          // Batch extract preview URLs
          const trackIds = tracksNeedingPreviews.map(t => t.id)
          const previewUrls = await client.getPreviewUrls(trackIds)

          // Update tracks with extracted preview URLs
          playlistTracks = playlistTracks.map(track => ({
            ...track,
            preview_url: previewUrls.get(track.id) || track.preview_url
          }))
        }

        // Filter out tracks without previews
        const originalCount = playlistTracks.length
        playlistTracks = playlistTracks.filter(track => track.preview_url)

        const skippedCount = originalCount - playlistTracks.length
        if (skippedCount > 0) {
          console.log(`⏭️ Skipped ${skippedCount} tracks without previews`)
          console.log(`✅ ${playlistTracks.length} tracks available with 30-second previews`)

          if (playlistTracks.length === 0) {
            alert('⚠️ No tracks in this playlist have preview clips available.\n\nPlease select a different playlist.')
            return
          } else if (skippedCount > originalCount * 0.5) {
            alert(`Preview Mode:\n\n${playlistTracks.length} out of ${originalCount} tracks have 30-second previews.\n\n${skippedCount} tracks will be skipped (no preview available).`)
          }
        }

        setTracks(playlistTracks)

        // Initialize question generator
        const generator = new QuestionGenerator({
          tracks: playlistTracks,
          lastFmApiKey: process.env.NEXT_PUBLIC_LASTFM_API_KEY
        })

        // Validate playlist has sufficient data
        if (!generator.isValid()) {
          const warnings = generator.getWarnings()
          console.error('Playlist validation failed:', warnings)
          alert(`Cannot start game:\n\n${warnings.join('\n\n')}\n\nPlease select a different playlist.`)
          return
        }

        questionGeneratorRef.current = generator
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
      if (audioRef.current) {
        audioRef.current.pause()
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
        if (audioRef.current) {
          audioRef.current.pause()
        }
        return
      }
    }

    // Mark track as played
    setPlayedTrackIndices(prev => new Set([...prev, trackIndex]))

    const track = tracks[trackIndex]
    const question = await questionGeneratorRef.current.generateQuestion(track, trackIndex)

    console.log(`🎯 Generated question for: "${track.name}" by ${track.artists?.[0]?.name || 'Unknown'}`)

    setCurrentQuestion(question)
    setAnsweredCorrectly(false)
    setSelectedWrongAnswer(null)
    setWrongAnswerTeamId(null)
    setBuzzedTeam(null)
    setShowAnswerPrompt(false)
    setShowNoAnswerDialog(false)
    setShowAlbumArt(false)
    setDisqualifiedTeams(new Set())
    hasAnswerRef.current = false
    trackHasStartedRef.current = false

    // Auto-play track
    if (track.preview_url && track.uri) {
      await playTrack(track.uri, track.preview_url)
    } else {
      console.warn('⚠️ Track has no preview URL or URI')
    }
  }

  const playTrack = async (trackUri: string, previewUrlOverride?: string) => {
    console.log(`🎵 Playing 30-second preview`)

    if (!audioRef.current) {
      console.error('❌ Audio player not initialized')
      return
    }

    const previewUrl = previewUrlOverride || currentQuestion?.track.preview_url

    if (!previewUrl) {
      console.error('❌ Track has no preview URL')
      setTimeout(() => handleNextQuestion(), 1000)
      return
    }

    try {
      audioRef.current.src = previewUrl
      audioRef.current.load()
      await audioRef.current.play()
      setIsPlaying(true)
      trackHasStartedRef.current = false
    } catch (error: any) {
      console.error('❌ Failed to play audio:', error)
      if (error.name === 'NotAllowedError') {
        console.log('🚫 Auto-play blocked - tap play button')
      }
      setIsPlaying(false)
    }
  }

  const handleAnswerDrag = (answer: string, x: number, y: number, draggingTeamId: string) => {
    if (!currentQuestion || currentQuestion.type !== 'drag-to-corner' || answeredCorrectly) return

    // In tap mode, teamId is always provided
    const droppedOnTeamId = draggingTeamId

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

        // Advance to next question after a delay (shorter on iOS to keep session alive)
        const albumArtDelay = 3000  // Universal delay
        setTimeout(() => {
          handleNextQuestion()
        }, albumArtDelay)
      } else {
        // Show wrong answer feedback
        setSelectedWrongAnswer(answer)
        setWrongAnswerTeamId(droppedOnTeamId)

        // Disqualify the team from trying again
        const newDisqualified = new Set([...disqualifiedTeams, droppedOnTeamId])
        setDisqualifiedTeams(newDisqualified)
        console.log(`Wrong answer! ${team?.name} is now disqualified from this question.`)

        // Check if all teams are now disqualified
        if (newDisqualified.size === teams.length) {
          console.log('All teams disqualified - showing album art and advancing')

          // Play wrong answer buzzer sound only when all teams got it wrong
          const wrongBuzzer = new Audio('/sounds/buzzer.mp3')
          wrongBuzzer.play().catch(err => console.warn('Wrong answer buzzer failed:', err))

          setShowAlbumArt(true)
          const albumArtDelay = 3000  // Universal delay
          setTimeout(() => {
            handleNextQuestion()
          }, albumArtDelay)
        }
      }
    }
  }

  const handleNextQuestion = async () => {
    setQuestionIndex((prev) => prev + 1)
    setIsPlaying(false)

    // Stop current audio
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.currentTime = 0
    }

    // Short delay before next question
    const delay = 500
    setTimeout(() => {
      generateNextQuestion()
    }, delay)
  }

  const handlePlayAudio = async () => {
    if (!playerReady || !audioRef.current) return

    // Play or resume HTML5 audio
    if (currentQuestion && currentQuestion.track.uri && currentQuestion.track.preview_url) {
      await playTrack(currentQuestion.track.uri, currentQuestion.track.preview_url)
    } else if (audioRef.current.src) {
      // Resume if there's a loaded track
      audioRef.current.play()
    }
  }

  const handleStopAudio = async () => {
    if (audioRef.current) {
      audioRef.current.pause()
      setIsPlaying(false)
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

  const handleHasAnswered = async (answered: boolean) => {
    if (!answered) {
      // Team didn't answer - clear buzzer and let other teams try
      setBuzzedTeam(null)
      setShowAnswerPrompt(false)
      // Restart music
      if (currentQuestion && playerReady && currentQuestion.track.uri) {
        await playTrack(currentQuestion.track.uri)
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
    const albumArtDelay = 3000  // Universal delay
    setTimeout(() => {
      handleNextQuestion()
    }, albumArtDelay)
  }

  const handleBuzzIncorrect = () => {
    // No points awarded
    hasAnswerRef.current = true
    const team = teams.find(t => t.id === buzzedTeam)
    console.log(`${team?.name} got it wrong - no points awarded`)

    // Clear buzzer and advance immediately to next question
    setBuzzedTeam(null)
    setShowAnswerPrompt(false)
    handleNextQuestion()
  }

  const handleNoAnswerContinue = () => {
    console.log('No answer given - moving to next question')
    setShowNoAnswerDialog(false)
    handleNextQuestion()
  }

  const handleZoneTouch = async (zoneId: string) => {
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
      if (audioRef.current) {
        audioRef.current.pause()
      }
    }
  }

  if (!playlist || teams.length === 0) {
    return <div className="min-h-screen bg-black flex items-center justify-center text-white">Loading...</div>
  }

  return (
    <div className="min-h-screen bg-black relative overflow-hidden">
      {/* Logout button - only on start page */}
      {!gameStarted && !gameCompleted && (
        <button
          onClick={() => signOut({ callbackUrl: '/' })}
          className="absolute top-4 right-4 z-50 text-gray-400 hover:text-white transition-colors text-xs bg-black/50 px-3 py-1 rounded"
        >
          Log Out
        </button>
      )}

      {/* Touch zones - only visible for buzz-in questions and hidden when showing dialogs */}
      {(!currentQuestion || currentQuestion.type === 'buzz-in') && !showAlbumArt && !showAnswerPrompt && !showNoAnswerDialog && (
        <TouchZones
          zones={touchZones}
          teams={teams}
          disqualifiedTeams={disqualifiedTeams}
          celebratingTeam={celebratingTeam}
          onZoneTouch={handleZoneTouch}
          currentQuestionType={currentQuestion?.type || null}
          buzzedTeam={buzzedTeam}
        />
      )}

      {/* Question counter on both sides */}
      {gameStarted && currentQuestion && (
        <>
          {[
            { side: 'left', className: teams.length === 6 ? 'left-40' : 'left-4' },
            { side: 'right', className: teams.length === 6 ? 'right-40 rotate-180' : 'right-4 rotate-180' }
          ].map(({ side, className }) => (
            <div key={side} className={`absolute top-1/2 -translate-y-1/2 text-gray-400 text-sm z-40 ${className}`}>
              Question {playedTrackIndices.size} of {tracks.length}
            </div>
          ))}
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
                teams={teams}
                currentQuestion={currentQuestion}
                answeredCorrectly={answeredCorrectly}
                selectedWrongAnswer={selectedWrongAnswer}
                wrongAnswerTeamId={wrongAnswerTeamId}
                onAnswerDrag={handleAnswerDrag}
                playedCount={playedTrackIndices.size}
                totalTracks={tracks.length}
                buzzedTeam={buzzedTeam}
                isRotated={true}
              />
            }
            centerContent={
              <>
                {/* Play/Pause button - hidden when showing answer dialogs */}
                {!showAnswerPrompt && !showAlbumArt && !showNoAnswerDialog && (
                  <div className={`absolute top-4 ${teams.length === 6 ? 'left-40' : 'left-4'}`}>
                    <button
                      onClick={isPlaying ? handleStopAudio : handlePlayAudio}
                      className={`${
                        isPlaying
                          ? 'bg-green-500 hover:bg-green-600 active:bg-green-700'
                          : 'bg-orange-500 hover:bg-orange-600 active:bg-orange-700'
                      } text-white font-bold py-3 px-6 rounded-full transition-colors touch-manipulation shadow-lg`}
                    >
                      {isPlaying ? '🎵 Playing...' : '⏸️ Paused'}
                    </button>
                  </div>
                )}

                {/* Album art when answer is revealed - covers entire screen with black background, rotated 90 degrees */}
                {showAlbumArt && currentQuestion && !showAnswerPrompt && (
                  <div className="fixed inset-0 bg-black z-[150] flex flex-col items-center justify-center gap-3 sm:gap-4">
                    <div className="rotate-90 scale-75 sm:scale-90 md:scale-100">
                      <AlbumArtDisplay track={currentQuestion.track} />
                    </div>
                  </div>
                )}

                {/* Dialogs - visible from both sides */}
                {/* Stage 1: Has the team answered? */}
                {currentQuestion.type === 'buzz-in' && buzzedTeam && !showAnswerPrompt && (
                  <div className="bg-gray-800/95 p-3 sm:p-6 rounded-xl max-w-xs sm:max-w-md mx-auto shadow-2xl border-2 border-white/30 backdrop-blur-sm">
                    <div className="text-base sm:text-2xl font-bold text-white mb-3 sm:mb-6 text-center">
                      Has {teams.find(t => t.id === buzzedTeam)?.name} answered?
                    </div>
                    <button
                      onClick={() => handleHasAnswered(true)}
                      className="w-full bg-green-500 hover:bg-green-600 active:bg-green-700 text-white font-bold py-2 px-4 sm:py-4 sm:px-8 rounded-full text-base sm:text-xl transition-colors touch-manipulation"
                    >
                      ✓ Yes
                    </button>
                  </div>
                )}

                {/* Stage 2: Combined Album Art + Answer Verification - covers entire screen with black background, rotated 90 degrees */}
                {currentQuestion.type === 'buzz-in' && buzzedTeam && showAnswerPrompt && (
                  <div className="fixed inset-0 bg-black z-[150] flex items-center justify-center">
                    <div className="rotate-90 scale-75 sm:scale-90 md:scale-100 flex flex-col items-center justify-center gap-3 sm:gap-4">
                      <AlbumArtDisplay track={currentQuestion.track} />

                      {/* Answer Verification Prompt - Compact */}
                      <div className="bg-gray-800/95 p-3 sm:p-4 rounded-xl max-w-xs sm:max-w-md w-full shadow-2xl border-2 border-white/30 backdrop-blur-sm">
                        <div className="text-base sm:text-xl font-bold text-white mb-3 sm:mb-4 text-center">
                          Did {teams.find(t => t.id === buzzedTeam)?.name} get the question right?
                        </div>
                        <div className="grid grid-cols-2 gap-2 sm:gap-3">
                          <button
                            onClick={handleBuzzCorrect}
                            className="bg-green-500 hover:bg-green-600 active:bg-green-700 text-white font-bold py-2 px-3 sm:py-3 sm:px-4 rounded-full text-sm sm:text-base transition-colors touch-manipulation"
                          >
                            ✓ Yes
                          </button>
                          <button
                            onClick={handleBuzzIncorrect}
                            className="bg-red-500 hover:bg-red-600 active:bg-red-700 text-white font-bold py-2 px-3 sm:py-3 sm:px-4 rounded-full text-sm sm:text-base transition-colors touch-manipulation"
                          >
                            ✗ No
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* No answer dialog - covers entire screen with black background */}
                {showNoAnswerDialog && (
                  <div className="fixed inset-0 bg-black z-[150] flex flex-col items-center justify-center gap-3 sm:gap-4">
                    <AlbumArtDisplay track={currentQuestion.track} />

                    {/* No Answer Prompt - Compact */}
                    <div className="bg-gray-800/95 p-3 sm:p-4 rounded-xl max-w-xs sm:max-w-md w-full shadow-2xl border-2 border-white/30 backdrop-blur-sm">
                      <div className="text-base sm:text-xl font-bold text-white mb-3 sm:mb-4 text-center">
                        Time's up! No one answered.
                      </div>
                      <button
                        onClick={handleNoAnswerContinue}
                        className="w-full bg-blue-500 hover:bg-blue-600 active:bg-blue-700 text-white font-bold py-2 px-3 sm:py-3 sm:px-6 rounded-full text-sm sm:text-base transition-colors touch-manipulation"
                      >
                        Continue
                      </button>
                    </div>
                  </div>
                )}

              </>
            }
            lowerContent={
              <TeamZoneContent
                teams={teams}
                currentQuestion={currentQuestion}
                answeredCorrectly={answeredCorrectly}
                selectedWrongAnswer={selectedWrongAnswer}
                wrongAnswerTeamId={wrongAnswerTeamId}
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
