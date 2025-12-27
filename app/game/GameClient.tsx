'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
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
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(30) // 30 second preview
  const [shuffleMode, setShuffleMode] = useState(true)
  const [playedTrackIndices, setPlayedTrackIndices] = useState<Set<number>>(new Set())
  const [celebratingTeam, setCelebratingTeam] = useState<string | null>(null)
  const [showNoAnswerDialog, setShowNoAnswerDialog] = useState(false)
  const [showAlbumArt, setShowAlbumArt] = useState(false)
  const [gameEndReason, setGameEndReason] = useState<'score_limit' | 'tracks_exhausted'>('tracks_exhausted')
  const [answerCountdown, setAnswerCountdown] = useState(5)
  const questionGeneratorRef = useRef<QuestionGenerator | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const hasAnswerRef = useRef(false)
  const trackHasStartedRef = useRef(false)
  const gameEndedRef = useRef(false)

  useEffect(() => {
    if (!playlist || teams.length === 0) {
      router.push('/setup')
    }
  }, [playlist, teams, router])

  // Initialize HTML5 Audio for all platforms (30-second previews)
  useEffect(() => {
    if (typeof window === 'undefined') return

    // Create HTML5 audio element
    const audio = new Audio()
    audioRef.current = audio

    // Audio event listeners
    audio.addEventListener('play', () => {
      setIsPlaying(true)
      trackHasStartedRef.current = true
    })

    audio.addEventListener('pause', () => {
      setIsPlaying(false)
    })

    audio.addEventListener('ended', () => {
      setIsPlaying(false)

      if (!hasAnswerRef.current) {
        // Wait for all options to reveal before showing dialog
        const maxDelay = currentQuestion?.optionRevealDelays
          ? Math.max(...currentQuestion.optionRevealDelays)
          : 0

        setTimeout(() => {
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

      setIsPlaying(false)
    })

    audio.addEventListener('timeupdate', () => {
      // Track that playback has started
      if (audio.currentTime > 0) {
        trackHasStartedRef.current = true
      }
      // Update current time and duration for countdown timer
      setCurrentTime(audio.currentTime)
      if (audio.duration && !isNaN(audio.duration)) {
        setDuration(audio.duration)
      }
    })

    setPlayerReady(true)

    return () => {
      audio.pause()
      audio.src = ''
    }
  }, [])

  // Auto-start game once tracks are loaded
  useEffect(() => {
    if (!loading && tracks.length > 0 && !gameStarted && !gameCompleted && questionGeneratorRef.current) {
      // Auto-start after a short delay
      const timer = setTimeout(() => {
        handleStartGame()
      }, 500)
      return () => clearTimeout(timer)
    }
  }, [loading, tracks.length, gameStarted, gameCompleted])

  // Answer countdown timer for "Has answered?" dialog
  useEffect(() => {
    // Only run countdown when showing the "Has answered?" dialog
    if (currentQuestion?.type === 'buzz-in' && buzzedTeam && !showAnswerPrompt) {
      // Reset countdown to 5 when a new team buzzes in
      setAnswerCountdown(5)

      // Start countdown interval
      const interval = setInterval(() => {
        setAnswerCountdown(prev => {
          if (prev <= 1) {
            // Time's up! Auto-trigger incorrect answer
            clearInterval(interval)
            handleBuzzIncorrect()
            return 0
          }
          return prev - 1
        })
      }, 1000)

      return () => clearInterval(interval)
    }
  }, [buzzedTeam, showAnswerPrompt, currentQuestion?.type])

  // Load tracks when component mounts
  useEffect(() => {
    async function loadTracks() {
      if (!playlist) return

      setLoading(true)
      try {
        const client = new SpotifyClient(accessToken)
        let playlistTracks = await client.getPlaylistTracks(playlist.id)

        // Extract preview URLs for tracks without them (ALL PLATFORMS)
        // Find tracks needing preview extraction
        const tracksNeedingPreviews = playlistTracks.filter(t => !t.preview_url)

        if (tracksNeedingPreviews.length > 0) {
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

  const checkWinCondition = (): { hasWinner: boolean; winnerId: string | null } => {
    // Always get fresh state from store to avoid stale state issues
    const currentTeams = useGameStore.getState().teams
    const winningTeam = currentTeams.find(team => team.score >= 10)
    return {
      hasWinner: !!winningTeam,
      winnerId: winningTeam?.id || null
    }
  }

  const handleGameWin = useCallback((winnerId: string, endReason: 'score_limit' | 'tracks_exhausted') => {
    if (gameEndedRef.current) return
    gameEndedRef.current = true

    if (audioRef.current) {
      audioRef.current.pause()
    }

    setGameStarted(false)
    setGameCompleted(true)
    setGameEndReason(endReason)
    setCurrentQuestion(null)
    setIsPlaying(false)

    const winningTeam = teams.find(t => t.id === winnerId)
    useGameStore.getState().saveGameResult(
      playedTrackIndices.size,
      endReason,
      winningTeam?.score
    )

    // Celebrate will be called separately after win check
    if (endReason === 'score_limit') {
      setCelebratingTeam(winnerId)
      setTimeout(() => setCelebratingTeam(null), 4000)
    }
  }, [teams, playedTrackIndices.size])

  const handleStartGame = async () => {
    if (!questionGeneratorRef.current || tracks.length === 0) return

    setGameStarted(true)
    await generateNextQuestion()
  }

  const generateNextQuestion = async () => {
    if (!questionGeneratorRef.current) return

    // Check if all tracks played (fallback win condition)
    if (playedTrackIndices.size >= tracks.length) {
      // Determine winner by highest score
      const sortedTeams = [...teams].sort((a, b) => b.score - a.score)
      const winnerId = sortedTeams[0].id

      handleGameWin(winnerId, 'tracks_exhausted')
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
        const sortedTeams = [...teams].sort((a, b) => b.score - a.score)
        const winnerId = sortedTeams[0].id

        handleGameWin(winnerId, 'tracks_exhausted')
        return
      }
    }

    // Mark track as played
    setPlayedTrackIndices(prev => new Set([...prev, trackIndex]))

    const track = tracks[trackIndex]
    const question = await questionGeneratorRef.current.generateQuestion(track, trackIndex)

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
        return
      }

      const isCorrect = answer === currentQuestion.correctAnswer

      if (isCorrect) {
        setAnsweredCorrectly(true)
        hasAnswerRef.current = true
        setShowAlbumArt(true)
        useGameStore.getState().updateScore(droppedOnTeamId, 1)

        // CHECK WIN CONDITION
        const { hasWinner, winnerId } = checkWinCondition()
        if (hasWinner && winnerId) {
          setTimeout(() => {
            celebrate(winnerId)
            handleGameWin(winnerId, 'score_limit')
          }, 1000)
          return
        }

        celebrate(droppedOnTeamId)

        // Advance to next question after a delay (shorter on iOS to keep session alive)
        const albumArtDelay = 3000  // Universal delay
        setTimeout(() => {
          handleNextQuestion()
        }, albumArtDelay)
      } else {
        // PENALTY: Deduct 1 point
        useGameStore.getState().updateScore(droppedOnTeamId, -1)

        // Show wrong answer feedback
        setSelectedWrongAnswer(answer)
        setWrongAnswerTeamId(droppedOnTeamId)

        // Disqualify the team from trying again
        const newDisqualified = new Set([...disqualifiedTeams, droppedOnTeamId])
        setDisqualifiedTeams(newDisqualified)

        // Check if all teams are now disqualified
        if (newDisqualified.size === teams.length) {
          // Play wrong answer buzzer sound only when all teams got it wrong
          const wrongBuzzer = new Audio('/sounds/buzzer.mp3')
          wrongBuzzer.volume = 1.0
          wrongBuzzer.load()
          wrongBuzzer.play().catch(err => console.error('❌ Buzzer play failed:', err))

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

  const handleRematch = async () => {
    // Reset game state but keep teams and playlist
    setQuestionIndex(0)
    setGameCompleted(false)
    setCurrentQuestion(null)
    setAnsweredCorrectly(false)
    setPlayedTrackIndices(new Set())
    setGameEndReason('tracks_exhausted')
    gameEndedRef.current = false

    // Reset all team scores to 0
    teams.forEach(team => {
      useGameStore.getState().updateScore(team.id, -team.score)
    })

    // Re-setup touch zones to ensure correct team mapping
    useGameStore.getState().setupTouchZones()

    // Automatically start the game
    setGameStarted(true)

    // Use setTimeout to ensure state updates are applied
    setTimeout(async () => {
      await generateNextQuestion()
    }, 100)
  }

  const handleNewGame = () => {
    // Reset all team scores to 0
    teams.forEach(team => {
      useGameStore.getState().updateScore(team.id, -team.score)
    })

    // Clear playlist and teams for fresh start
    useGameStore.getState().setPlaylist(null)
    useGameStore.getState().setTeams([])

    // Navigate to setup with team setup shown
    router.push('/setup?teams=new')
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

    // Play random celebration sound
    const celebrationSounds = [
      '/sounds/crowd-cheers.mp3',
      '/sounds/applause.mp3',
      '/sounds/crowd-cheering.mp3',
      '/sounds/fireworks.mp3',
    ]
    const randomSound = celebrationSounds[Math.floor(Math.random() * celebrationSounds.length)]
    const celebrationAudio = new Audio(randomSound)
    celebrationAudio.volume = 0.7
    celebrationAudio.play().catch(err => console.warn('Celebration sound failed:', err))

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

    // CHECK WIN CONDITION
    const { hasWinner, winnerId } = checkWinCondition()
    if (hasWinner && winnerId) {
      setTimeout(() => {
        celebrate(winnerId)
        handleGameWin(winnerId, 'score_limit')
      }, 1000)
      return
    }

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
    if (!buzzedTeam) return

    hasAnswerRef.current = true

    // PENALTY: Deduct 1 point
    useGameStore.getState().updateScore(buzzedTeam, -1)

    // Play wrong answer buzzer sound
    const wrongBuzzer = new Audio('/sounds/buzzer.mp3')
    wrongBuzzer.volume = 1.0
    wrongBuzzer.load()
    wrongBuzzer.play().catch(err => console.error('❌ Buzzer play failed:', err))

    // Show album art with correct answer (stays until user clicks Continue)
    setShowAlbumArt(true)
    setBuzzedTeam(null)
    setShowAnswerPrompt(false)
  }

  const handleAlbumArtContinue = () => {
    setShowAlbumArt(false)
    handleNextQuestion()
  }

  const handleNoAnswerContinue = () => {
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

    // For buzz-in, first team to touch gets to answer
    if (!buzzedTeam) {
      setBuzzedTeam(team.id)
      setIsPlaying(false)

      // Stop the music
      if (audioRef.current) {
        audioRef.current.pause()
      }
    }
  }

  if (!playlist || teams.length === 0) {
    return (
      <div className="min-h-screen cassette-gradient flex items-center justify-center">
        <p className="text-white text-2xl neon-text">Loading...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen cassette-gradient relative overflow-hidden">
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

      {/* Main content with dual-zone layout */}
      <div className="absolute inset-0 pointer-events-none">
        {(loading || (!gameStarted && !gameCompleted && tracks.length > 0)) && (
          <div className="fixed inset-0 cassette-gradient z-[150] flex items-center justify-center pointer-events-auto">
            <div className="rotate-90">
              <div
                className="text-5xl sm:text-6xl font-bold text-white whitespace-nowrap neon-text"
                style={{ fontFamily: 'var(--font-audiowide)' }}
              >
                STARTING GAME!
              </div>
            </div>
          </div>
        )}

        {gameCompleted && (
          <div className="fixed inset-0 cassette-gradient z-[150] flex items-center justify-center pointer-events-auto">
            <div className="rotate-90 scale-75 sm:scale-90 md:scale-100">
              <div className="flex items-center gap-12 p-4 pointer-events-auto">
                {/* Giant Trophy */}
                <div className="text-[12rem] leading-none">🏆</div>

                {/* All Content */}
                <div className="flex flex-col items-center gap-6">
                  {/* Winner Info */}
                  <div className="text-center">
                    <div
                      className="text-5xl sm:text-6xl md:text-7xl font-black mb-2"
                      style={{
                        fontFamily: 'var(--font-audiowide)',
                        color: [...teams].sort((a, b) => b.score - a.score)[0]?.color,
                        textShadow: '0 0 40px rgba(255,255,255,0.5), 0 0 80px rgba(255,255,255,0.3)'
                      }}
                    >
                      {[...teams].sort((a, b) => b.score - a.score)[0]?.name}
                    </div>
                    <div
                      className="text-3xl sm:text-4xl font-bold mb-2 neon-text"
                      style={{ fontFamily: 'var(--font-righteous)' }}
                    >
                      WINS!
                    </div>
                    {/* Score */}
                    <div className="text-5xl sm:text-6xl font-black text-yellow-400">
                      {(() => {
                        const sortedTeams = [...teams].sort((a, b) => b.score - a.score)
                        return `${sortedTeams[0]?.score} - ${sortedTeams[1]?.score}`
                      })()}
                    </div>
                  </div>

                  {/* Buttons */}
                  <div className="flex flex-col gap-3">
                    <button
                      onClick={handleRematch}
                      className="text-white font-bold py-4 px-12 rounded-full text-2xl transition-all duration-300 transform hover:scale-105 touch-manipulation shadow-2xl"
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
                      ↻ Rematch
                    </button>
                    <button
                      onClick={handleNewGame}
                      className="bg-gray-600/80 hover:bg-gray-700/80 border border-gray-600 text-white font-bold py-3 px-10 rounded-full text-lg transition-colors touch-manipulation"
                      style={{ fontFamily: 'var(--font-righteous)' }}
                    >
                      New Playlist
                    </button>
                  </div>
                </div>
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
                  <>
                    {/* Play/Pause button - centered and discreet */}
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <button
                        onClick={isPlaying ? handleStopAudio : handlePlayAudio}
                        className={`${
                          isPlaying
                            ? 'bg-green-500/80 hover:bg-green-600/80'
                            : 'bg-orange-500/80 hover:bg-orange-600/80'
                        } text-white text-xs sm:text-sm py-1.5 px-3 sm:py-2 sm:px-4 rounded-full transition-colors pointer-events-auto shadow-md`}
                      >
                        {isPlaying ? '🎵' : '⏸️'}
                      </button>
                    </div>

                    {/* Question text with countdown timers - two versions */}
                    {currentQuestion && (
                      <>
                        {/* Upper team question - rotated 180° */}
                        <div className="absolute top-2 sm:top-4 left-0 right-0 px-4 pointer-events-none">
                          <div className="flex items-center justify-center gap-3 sm:gap-4 rotate-180">
                            {/* Spacing to balance the layout */}
                            {isPlaying && duration - currentTime <= 10 && duration - currentTime > 0 && (
                              <div className="text-3xl sm:text-4xl md:text-5xl font-bold tabular-nums opacity-0" style={{ fontFamily: 'var(--font-vt323)' }}>
                                {Math.ceil(duration - currentTime)}
                              </div>
                            )}
                            <div className={`text-yellow-400 font-bold text-center max-w-4xl transition-all duration-300 ${isPlaying && duration - currentTime <= 10 && duration - currentTime > 0 ? 'text-3xl sm:text-4xl md:text-5xl animate-pulse-strong' : 'text-3xl'}`} style={{ textShadow: '0 4px 20px rgba(0,0,0,0.9), 0 2px 4px rgba(0,0,0,1)' }}>
                              {currentQuestion.question.split(/(song|artist)/i).map((part, i) =>
                                /^(song|artist)$/i.test(part) ? (
                                  <span key={i} className="text-white animate-pulse" style={{ textShadow: '0 0 30px rgba(255,255,255,1), 0 0 60px rgba(255,255,255,0.8), 0 0 90px rgba(255,255,255,0.6), 0 0 120px rgba(255,255,255,0.4)' }}>{part}</span>
                                ) : part
                              )}
                            </div>
                            {/* Countdown timer for upper team */}
                            {isPlaying && duration - currentTime <= 10 && duration - currentTime > 0 && (
                              <div className="animate-pulse">
                                <div
                                  className="text-3xl sm:text-4xl md:text-5xl font-bold tabular-nums"
                                  style={{
                                    fontFamily: 'var(--font-vt323)',
                                    color: '#FF007A',
                                    textShadow: '0 0 20px #FF007A, 0 0 40px #FF007A, 0 0 60px #FF007A, 0 4px 20px rgba(0,0,0,0.9)',
                                  }}
                                >
                                  {Math.ceil(duration - currentTime)}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Lower team question - normal orientation */}
                        <div className="absolute bottom-2 sm:bottom-4 left-0 right-0 px-4 pointer-events-none">
                          <div className="flex items-center justify-center gap-3 sm:gap-4">
                            {/* Spacing to balance the layout */}
                            {isPlaying && duration - currentTime <= 10 && duration - currentTime > 0 && (
                              <div className="text-3xl sm:text-4xl md:text-5xl font-bold tabular-nums opacity-0" style={{ fontFamily: 'var(--font-vt323)' }}>
                                {Math.ceil(duration - currentTime)}
                              </div>
                            )}
                            <div className={`text-yellow-400 font-bold text-center max-w-4xl transition-all duration-300 ${isPlaying && duration - currentTime <= 10 && duration - currentTime > 0 ? 'text-3xl sm:text-4xl md:text-5xl animate-pulse-strong' : 'text-3xl'}`} style={{ textShadow: '0 4px 20px rgba(0,0,0,0.9), 0 2px 4px rgba(0,0,0,1)' }}>
                              {currentQuestion.question.split(/(song|artist)/i).map((part, i) =>
                                /^(song|artist)$/i.test(part) ? (
                                  <span key={i} className="text-white animate-pulse" style={{ textShadow: '0 0 30px rgba(255,255,255,1), 0 0 60px rgba(255,255,255,0.8), 0 0 90px rgba(255,255,255,0.6), 0 0 120px rgba(255,255,255,0.4)' }}>{part}</span>
                                ) : part
                              )}
                            </div>
                            {/* Countdown timer for lower team */}
                            {isPlaying && duration - currentTime <= 10 && duration - currentTime > 0 && (
                              <div className="animate-pulse">
                                <div
                                  className="text-3xl sm:text-4xl md:text-5xl font-bold tabular-nums"
                                  style={{
                                    fontFamily: 'var(--font-vt323)',
                                    color: '#FF007A',
                                    textShadow: '0 0 20px #FF007A, 0 0 40px #FF007A, 0 0 60px #FF007A, 0 4px 20px rgba(0,0,0,0.9)',
                                  }}
                                >
                                  {Math.ceil(duration - currentTime)}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </>
                    )}
                  </>
                )}

                {/* Album art when answer is revealed - covers entire screen with cassette gradient, rotated 90 degrees */}
                {showAlbumArt && currentQuestion && !showAnswerPrompt && (
                  <div className="fixed inset-0 cassette-gradient z-[150] flex flex-col items-center justify-center gap-3 sm:gap-4">
                    <div className="rotate-90 scale-75 sm:scale-90 md:scale-100 flex flex-row items-center gap-8">
                      {/* Continue button on the left */}
                      <button
                        onClick={handleAlbumArtContinue}
                        className="text-white font-bold py-4 px-12 sm:py-6 sm:px-16 rounded-full text-2xl sm:text-3xl transition-all duration-300 touch-manipulation shadow-2xl"
                        style={{
                          backgroundColor: 'var(--neon-pink)',
                          fontFamily: 'var(--font-righteous)',
                          boxShadow: '0 0 20px var(--neon-pink), 0 0 40px var(--neon-pink)',
                        }}
                      >
                        Continue →
                      </button>

                      <AlbumArtDisplay track={currentQuestion.track} />
                    </div>
                  </div>
                )}

                {/* Stage 1: Has the team answered? - Black plate with rotated content */}
                {currentQuestion.type === 'buzz-in' && buzzedTeam && !showAnswerPrompt && (
                  <div className="absolute inset-0 flex items-center justify-center cassette-gradient z-[100]">
                    <div className="rotate-90 flex flex-col items-center gap-6 sm:gap-8">
                      {/* Question text - constrained to neutral area width */}
                      <div
                        className="text-2xl sm:text-3xl md:text-4xl text-white font-bold text-center max-w-[250px] sm:max-w-[300px]"
                        style={{
                          fontFamily: 'var(--font-righteous)',
                          textShadow: '0 4px 20px rgba(0,0,0,0.9), 0 2px 4px rgba(0,0,0,1)'
                        }}
                      >
                        Has {teams.find(t => t.id === buzzedTeam)?.name} answered?
                      </div>

                      {/* Countdown timer */}
                      <div
                        className={`text-4xl sm:text-5xl md:text-6xl font-bold tabular-nums ${answerCountdown <= 3 ? 'animate-pulse-strong' : ''}`}
                        style={{
                          fontFamily: 'var(--font-vt323)',
                          color: answerCountdown <= 3 ? '#FF007A' : '#FFE600',
                          textShadow: answerCountdown <= 3
                            ? '0 0 20px #FF007A, 0 0 40px #FF007A, 0 0 60px #FF007A, 0 4px 20px rgba(0,0,0,0.9)'
                            : '0 0 20px #FFE600, 0 0 40px #FFE600, 0 4px 20px rgba(0,0,0,0.9)',
                        }}
                      >
                        {answerCountdown}
                      </div>

                      {/* Yes button */}
                      <button
                        onClick={() => handleHasAnswered(true)}
                        className="text-white font-bold py-6 px-12 sm:py-8 sm:px-16 rounded-full text-3xl sm:text-4xl transition-all duration-300 touch-manipulation shadow-2xl"
                        style={{
                          backgroundColor: 'var(--neon-pink)',
                          fontFamily: 'var(--font-righteous)',
                          boxShadow: '0 0 20px var(--neon-pink), 0 0 40px var(--neon-pink)',
                        }}
                      >
                        ✓ Yes
                      </button>
                    </div>
                  </div>
                )}

                {/* Stage 2: Combined Album Art + Answer Verification - covers entire screen with cassette gradient, rotated 90 degrees */}
                {currentQuestion.type === 'buzz-in' && buzzedTeam && showAnswerPrompt && (
                  <div className="fixed inset-0 cassette-gradient z-[150] flex items-center justify-center">
                    <div className="rotate-90 scale-75 sm:scale-90 md:scale-100 flex items-center gap-8 -mt-24 sm:-mt-32 md:-mt-40">
                      {/* Answer Verification Prompt - Left side, narrower */}
                      <div className="bg-gray-800/95 p-3 sm:p-4 rounded-xl max-w-[200px] h-64 sm:h-80 md:h-96 shadow-2xl border-2 border-gray-700 backdrop-blur-sm flex-shrink-0 flex flex-col justify-center gap-3">
                        <button
                          onClick={handleBuzzCorrect}
                          className="text-white font-bold py-6 px-8 rounded-full text-2xl sm:text-3xl transition-all duration-300 touch-manipulation"
                          style={{
                            backgroundColor: 'var(--neon-pink)',
                            fontFamily: 'var(--font-righteous)',
                            boxShadow: '0 0 20px var(--neon-pink)',
                          }}
                        >
                          ✓ Yes
                        </button>
                        <div
                          className="text-base sm:text-lg font-bold text-white text-center"
                          style={{ fontFamily: 'var(--font-righteous)' }}
                        >
                          Is {teams.find(t => t.id === buzzedTeam)?.name} answer correct?
                        </div>
                        <button
                          onClick={handleBuzzIncorrect}
                          className="text-white font-bold py-6 px-8 rounded-full text-2xl sm:text-3xl transition-all duration-300 touch-manipulation"
                          style={{
                            backgroundColor: 'var(--hot-magenta)',
                            fontFamily: 'var(--font-righteous)',
                            boxShadow: '0 0 20px var(--hot-magenta)',
                          }}
                        >
                          ✗ No
                        </button>
                      </div>

                      {/* Album art with track info - Right side */}
                      <AlbumArtDisplay
                        track={currentQuestion.track}
                        highlightSong={currentQuestion.question.toLowerCase().includes('song')}
                        highlightArtist={currentQuestion.question.toLowerCase().includes('artist')}
                      />
                    </div>
                  </div>
                )}

                {/* No answer dialog - covers entire screen with cassette gradient, rotated 90 degrees */}
                {showNoAnswerDialog && (
                  <div className="fixed inset-0 cassette-gradient z-[150] flex items-center justify-center">
                    <div className="rotate-90 scale-75 sm:scale-90 md:scale-100 flex items-center gap-8 -mt-24 sm:-mt-32 md:-mt-40">
                      {/* No Answer Prompt - Left side */}
                      <div className="bg-gray-800/95 p-3 sm:p-4 rounded-xl w-64 h-64 sm:w-80 sm:h-80 md:w-96 md:h-96 shadow-2xl border-2 border-gray-700 backdrop-blur-sm flex-shrink-0 flex flex-col justify-center gap-3">
                        <div
                          className="text-base sm:text-lg font-bold text-white text-center"
                          style={{ fontFamily: 'var(--font-righteous)' }}
                        >
                          Time's up! No one answered.
                        </div>
                        <button
                          onClick={handleNoAnswerContinue}
                          className="text-white font-bold py-6 px-8 rounded-full text-2xl sm:text-3xl transition-all duration-300 touch-manipulation"
                          style={{
                            backgroundColor: 'var(--neon-pink)',
                            fontFamily: 'var(--font-righteous)',
                            boxShadow: '0 0 20px var(--neon-pink)',
                          }}
                        >
                          Continue
                        </button>
                      </div>

                      {/* Album art with track info - Right side */}
                      <AlbumArtDisplay
                        track={currentQuestion.track}
                        highlightSong={currentQuestion.question.toLowerCase().includes('song')}
                        highlightArtist={currentQuestion.question.toLowerCase().includes('artist')}
                      />
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
