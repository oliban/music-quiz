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
  const [isIOSDevice, setIsIOSDevice] = useState(false)
  const [showReconnectDialog, setShowReconnectDialog] = useState(false)
  const [availableDevices, setAvailableDevices] = useState<any[]>([])
  const [reconnecting, setReconnecting] = useState(false)
  const persistedDeviceId = useGameStore((state) => state.spotifyDeviceId)
  const setSpotifyDevice = useGameStore((state) => state.setSpotifyDevice)
  const questionGeneratorRef = useRef<QuestionGenerator | null>(null)
  const zoneRefs = useRef<Map<string, DOMRect>>(new Map())
  const playerRef = useRef<any>(null)
  const deviceIdRef = useRef<string | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const hasAnswerRef = useRef(false)
  const trackHasStartedRef = useRef(false)

  useEffect(() => {
    if (!playlist || teams.length === 0) {
      router.push('/setup')
    }
  }, [playlist, teams, router])

  // Initialize HTML5 Audio for iOS (30-second previews)
  useEffect(() => {
    if (typeof window === 'undefined') return

    // Detect iOS
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream
    setIsIOSDevice(isIOS)

    if (isIOS) {
      console.log('📱 iOS detected - Will use 30-second preview clips')

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
          console.log('Track ended with no answer - showing continue dialog')
          setShowNoAnswerDialog(true)
        }
      })

      audio.addEventListener('error', (e) => {
        const audioElement = e.target as HTMLAudioElement
        const error = audioElement.error

        // Ignore errors when there's no src (initialization) or empty src
        if (!audioElement.src || audioElement.src === window.location.href) {
          return
        }

        console.error('❌ Audio error occurred:')
        console.error('  Error code:', error?.code)
        console.error('  Error message:', error?.message)
        console.error('  Current src:', audioElement.src)

        const errorMessages: Record<number, string> = {
          1: 'MEDIA_ERR_ABORTED - Playback aborted',
          2: 'MEDIA_ERR_NETWORK - Network error',
          3: 'MEDIA_ERR_DECODE - Decode error',
          4: 'MEDIA_ERR_SRC_NOT_SUPPORTED - Source not supported'
        }

        if (error?.code) {
          console.error('  Type:', errorMessages[error.code] || 'Unknown error')
        }

        setIsPlaying(false)
      })

      audio.addEventListener('timeupdate', () => {
        // Track that playback has started
        if (audio.currentTime > 0) {
          trackHasStartedRef.current = true
        }
      })

      setPlayerReady(true)
      console.log('✅ HTML5 audio player ready for iOS')

      return () => {
        audio.pause()
        audio.src = ''
      }
    }

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

        // Track if song has actually started playing (position > 0)
        // This prevents false positives on iOS where SDK reports position=0 before playback starts
        if (!state.paused && state.position > 0) {
          trackHasStartedRef.current = true
        }

        // Check if track ended - Spotify sets position to 0 when track finishes
        // Only trigger if track has actually started playing first (fixes iOS issue)
        if (state.paused && state.position === 0 && state.duration > 0 && trackHasStartedRef.current) {
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
        let playlistTracks = await client.getPlaylistTracks(playlist.id)

        // On iOS, attempt to extract preview URLs for tracks without them
        if (isIOSDevice) {
          console.log('📱 iOS detected - extracting preview URLs from embed player...')

          // Find tracks needing preview extraction
          const tracksNeedingPreviews = playlistTracks.filter(t => !t.preview_url)

          if (tracksNeedingPreviews.length > 0) {
            console.log(`🔍 Extracting previews for ${tracksNeedingPreviews.length} tracks...`)

            // Batch extract preview URLs
            const trackIds = tracksNeedingPreviews.map(t => t.id)
            const previewUrls = await client.getPreviewUrls(trackIds)

            // Update tracks with extracted preview URLs
            playlistTracks = playlistTracks.map(track => {
              if (!track.preview_url && previewUrls.has(track.id)) {
                const extractedUrl = previewUrls.get(track.id)
                if (extractedUrl) {
                  return { ...track, preview_url: extractedUrl }
                }
              }
              return track
            })
          }

          // Filter out tracks still without previews (extraction failed)
          const originalCount = playlistTracks.length
          playlistTracks = playlistTracks.filter(track => {
            const hasPreview = track.preview_url && typeof track.preview_url === 'string'
            if (!hasPreview) {
              console.log(`⏭️ Skipping "${track.name}" - no preview available`)
            }
            return hasPreview
          })

          // Existing warning logic
          const skippedCount = originalCount - playlistTracks.length
          if (skippedCount > 0) {
            console.log(`📱 iOS: Filtered out ${skippedCount} tracks without previews`)
            console.log(`✅ ${playlistTracks.length} tracks available with 30-second previews`)

            if (playlistTracks.length === 0) {
              alert('⚠️ No tracks in this playlist have preview clips available.\n\nPlease select a different playlist or use a desktop browser for full songs.')
              return
            } else if (skippedCount > originalCount * 0.5) {
              // More than 50% filtered
              alert(`📱 iOS Preview Mode:\n\n${playlistTracks.length} out of ${originalCount} tracks have 30-second previews.\n\n${skippedCount} tracks will be skipped (no preview available).\n\nFor full songs, use a desktop browser.`)
            }
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
  }, [playlist, accessToken, isIOSDevice])

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

    console.log(`🎯 Generated question for: "${track.name}" by ${track.artists?.[0]?.name || 'Unknown'}`)

    setCurrentQuestion(question)
    setAnsweredCorrectly(false)
    setBuzzedTeam(null)
    setShowAnswerPrompt(false)
    setShowNoAnswerDialog(false)
    setShowAlbumArt(false)
    setDisqualifiedTeams(new Set())
    hasAnswerRef.current = false
    trackHasStartedRef.current = false

    // Auto-play track
    if (isIOSDevice && track.preview_url) {
      // iOS: Auto-play 30-second preview
      // Pass preview URL directly to avoid state timing issues
      await playTrack(track.uri, 0, true, track.preview_url)
    } else if (playerReady && deviceIdRef.current && track.uri) {
      // Desktop: Play full song using Spotify Web Playback SDK
      await playTrack(track.uri)
    } else {
      console.warn('⚠️ Spotify Player not ready yet. Click "Play Audio" when ready.')
    }
  }

  const reconnectSpotify = async () => {
    setReconnecting(true)
    try {
      console.log('🔄 Attempting to reconnect Spotify...')

      // Get available devices
      const response = await fetch('https://api.spotify.com/v1/me/player/devices', {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        }
      })

      if (response.ok) {
        const data = await response.json()
        const devices = data.devices || []
        setAvailableDevices(devices)
        console.log('📱 Found devices:', devices.map((d: any) => d.name))

        // Prioritize smartphone/mobile devices
        const mobileDevice = devices.find((d: any) =>
          d.type === 'Smartphone' || d.name.toLowerCase().includes('iphone')
        )
        const activeDevice = devices.find((d: any) => d.is_active)
        const deviceToUse = mobileDevice || activeDevice || devices[0]

        if (deviceToUse) {
          console.log(`✅ Reconnecting to: ${deviceToUse.name}`)

          // Transfer playback to this device
          const transferResponse = await fetch('https://api.spotify.com/v1/me/player', {
            method: 'PUT',
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              device_ids: [deviceToUse.id],
              play: false
            })
          })

          if (transferResponse.ok || transferResponse.status === 204) {
            deviceIdRef.current = deviceToUse.id
            setSpotifyDevice(deviceToUse.id, deviceToUse.name)
            setPlayerReady(true)
            setShowReconnectDialog(false)
            console.log('✅ Reconnected successfully!')

            // Try to continue with current question
            if (currentQuestion && currentQuestion.track.uri) {
              await playTrack(currentQuestion.track.uri)
            }
          }
        } else {
          console.warn('No devices available')
        }
      }
    } catch (error) {
      console.error('Failed to reconnect:', error)
    } finally {
      setReconnecting(false)
    }
  }

  const ensureDeviceActive = async (): Promise<boolean> => {
    // On iOS, ensure device is still active before playing
    if (!isIOSDevice || !deviceIdRef.current) return true

    try {
      console.log('🔍 Checking if device still exists...')

      // First, get list of available devices
      const devicesResponse = await fetch('https://api.spotify.com/v1/me/player/devices', {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        }
      })

      if (devicesResponse.ok) {
        const data = await devicesResponse.json()
        const devices = data.devices || []
        console.log(`📱 Found ${devices.length} device(s):`, devices.map((d: any) => d.name))

        // Check if our device is still available
        const ourDevice = devices.find((d: any) => d.id === deviceIdRef.current)

        if (!ourDevice) {
          console.error('❌ Our device is no longer available!')
          console.log('Available devices:', devices.map((d: any) => `${d.name} (${d.type})`))
          return false
        }

        console.log(`✅ Device found: ${ourDevice.name} (active: ${ourDevice.is_active})`)
      }

      // Transfer playback to our device
      console.log('🔄 Transferring playback to device...')
      const transferResponse = await fetch('https://api.spotify.com/v1/me/player', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          device_ids: [deviceIdRef.current],
          play: false
        })
      })

      if (transferResponse.ok || transferResponse.status === 204) {
        console.log('✅ Device activated successfully')
        // Small delay to let Spotify process the transfer
        await new Promise(resolve => setTimeout(resolve, 500))
        return true
      } else {
        console.warn('⚠️ Failed to activate device')
        return false
      }
    } catch (error) {
      console.error('Failed to ensure device active:', error)
      return false
    }
  }

  const playTrack = async (trackUri: string, retryCount = 0, reactivateDevice = true, previewUrlOverride?: string) => {
    console.log(`🎵 playTrack called (trackUri: ${trackUri})`)

    // On iOS, use HTML5 audio with preview URL
    if (isIOSDevice && audioRef.current) {
      const previewUrl = previewUrlOverride || currentQuestion?.track.preview_url

      // This should always have a preview since we filtered on load
      // But double-check just in case
      if (!previewUrl) {
        console.error('❌ Track has no preview URL (this should not happen - filtering failed)')
        setTimeout(() => handleNextQuestion(), 1000)
        return
      }

      try {
        console.log('🎵 Playing 30-second preview:', currentQuestion?.track?.name || 'Loading...')
        console.log('📎 Preview URL:', previewUrl)

        // Set the source and attempt to play
        audioRef.current.src = previewUrl
        audioRef.current.load() // Explicitly load the audio

        const playPromise = audioRef.current.play()

        if (playPromise !== undefined) {
          await playPromise
          console.log('✅ Audio playback started successfully')
          setIsPlaying(true)
          trackHasStartedRef.current = false // Will be set to true by timeupdate event
        }
      } catch (error: any) {
        console.error('❌ Failed to play audio:', error)
        console.error('  Error name:', error.name)
        console.error('  Error message:', error.message)

        if (error.name === 'NotAllowedError') {
          // Autoplay was blocked by the browser
          console.log('🚫 Auto-play blocked - tap play button to start')
        } else if (error.name === 'NotSupportedError') {
          alert('This audio format is not supported on your device.')
        } else {
          // Suppress common initialization errors
          if (!error.message?.includes('The play() request was interrupted')) {
            console.warn('⚠️ Audio play error:', error.message)
          }
        }

        setIsPlaying(false)
      }
      return
    }

    // Desktop: Use Spotify Web Playback SDK
    if (!deviceIdRef.current) {
      console.error('❌ No device ID available')
      return
    }

    try {
      // Use Spotify Web API to start playback on the device
      const url = `https://api.spotify.com/v1/me/player/play?device_id=${deviceIdRef.current}`
      console.log(`🎶 Requesting playback on device: ${deviceIdRef.current}`)

      const response = await fetch(url, {
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

        // On iOS, we need to poll for playback state since we don't have the SDK
        if (isIOSDevice) {
          startPlaybackStatePolling()
        }
      } else {
        // Try to parse error, but handle cases where body isn't JSON
        let error: any = {}
        try {
          const text = await response.text()
          if (text) {
            error = JSON.parse(text)
          }
        } catch (e) {
          console.error('Failed to parse error response')
        }

        console.error('❌ Playback error details:')
        console.error('  Status:', response.status)
        console.error('  Error:', error)

        if (response.status === 502) {
          // Bad Gateway - usually temporary Spotify server issue
          console.warn('⚠️ Spotify server temporarily unavailable (502 Bad Gateway)')

          // Retry up to 2 times with delay and device re-activation
          if (retryCount < 2) {
            console.log(`⏳ Waiting 3 seconds before retry ${retryCount + 1}/2...`)
            await new Promise(resolve => setTimeout(resolve, 3000))
            console.log('♻️ Retrying with device re-activation...')
            // Re-activate device before retry
            return playTrack(trackUri, retryCount + 1, true)
          } else {
            // Max retries reached
            if (isIOSDevice) {
              alert('Spotify is temporarily unavailable after multiple attempts.\n\nPlease:\n1. Make sure Spotify app is still open and active\n2. Try playing a song in Spotify briefly\n3. Return here and click Play')
            }
            setIsPlaying(false)
          }
        } else if (response.status === 404) {
          console.warn('⚠️ Device not found')

          // On iOS, try to re-activate device
          if (isIOSDevice && retryCount < 2) {
            console.log('🔄 Device lost - attempting to re-activate...')
            // Retry with device re-activation
            await new Promise(resolve => setTimeout(resolve, 1000))
            return playTrack(trackUri, retryCount + 1, true)
          } else {
            // Show alert only after retry failed
            if (isIOSDevice) {
              alert('Spotify device connection lost.\n\nPlease:\n1. Open Spotify app on your iPhone\n2. Play any song briefly\n3. Return here and click Play to continue')
            } else {
              console.warn('💡 Click "Play Audio" button to start playback manually')
            }
            setIsPlaying(false)
          }
        } else if (response.status === 403) {
          console.error('⚠️ 403 Forbidden - Possible causes:')
          console.error('  1. Token scopes missing (should have: streaming, user-modify-playback-state)')
          console.error('  2. Device not properly activated')
          console.error('  3. Account restrictions (region, family plan, etc.)')
        }
      }
    } catch (error) {
      console.error('Failed to start playback:', error)
    }
  }

  const startPlaybackStatePolling = () => {
    // Poll playback state every 500ms to detect when track ends
    const pollInterval = setInterval(async () => {
      try {
        const response = await fetch('https://api.spotify.com/v1/me/player', {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          }
        })

        // Handle 204 No Content (no active playback)
        if (response.status === 204) {
          setIsPlaying(false)
          return
        }

        if (response.ok) {
          // Check if there's content to parse
          const contentType = response.headers.get('content-type')
          if (!contentType || !contentType.includes('application/json')) {
            return
          }

          const text = await response.text()
          if (!text) {
            return
          }

          const state = JSON.parse(text)

          if (!state || !state.is_playing) {
            setIsPlaying(false)

            // Check if track ended
            if (state && state.progress_ms >= state.item?.duration_ms - 1000) {
              if (!hasAnswerRef.current) {
                console.log('Track ended with no answer - showing continue dialog')
                setShowNoAnswerDialog(true)
                clearInterval(pollInterval)
              }
            }
          } else {
            setIsPlaying(true)
            // Track that playback has started
            if (state.progress_ms > 0) {
              trackHasStartedRef.current = true
            }
          }
        }
      } catch (error) {
        console.error('Failed to poll playback state:', error)
        // Don't clear interval on single error - might be temporary
      }
    }, 500)

    // Clean up after 5 minutes
    setTimeout(() => clearInterval(pollInterval), 300000)
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

        // Advance to next question after a delay (shorter on iOS to keep session alive)
        const albumArtDelay = isIOSDevice ? 2000 : 4000
        setTimeout(() => {
          handleNextQuestion()
        }, albumArtDelay)
      } else {
        // Disqualify the team from trying again
        const newDisqualified = new Set([...disqualifiedTeams, droppedOnTeamId])
        setDisqualifiedTeams(newDisqualified)
        console.log(`Wrong answer! ${team?.name} is now disqualified from this question.`)

        // Check if all teams are now disqualified
        if (newDisqualified.size === teams.length) {
          console.log('All teams disqualified - showing album art and advancing')
          setShowAlbumArt(true)
          const albumArtDelay = isIOSDevice ? 2000 : 4000
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
    if (isIOSDevice && audioRef.current) {
      audioRef.current.pause()
      audioRef.current.currentTime = 0
    } else if (playerRef.current) {
      playerRef.current.pause()
    }

    // Short delay before next question
    const delay = 500
    setTimeout(() => {
      generateNextQuestion()
    }, delay)
  }

  const handlePlayAudio = async () => {
    if (!playerReady) return

    if (isIOSDevice && audioRef.current) {
      // On iOS, play or resume HTML5 audio
      if (currentQuestion && currentQuestion.track.uri) {
        await playTrack(currentQuestion.track.uri)
      } else if (audioRef.current.src) {
        // Resume if there's a loaded track
        audioRef.current.play()
      }
    } else if (playerRef.current) {
      // Desktop: use SDK
      if (!isPlaying) {
        playerRef.current.resume()
      } else if (currentQuestion && currentQuestion.track.uri) {
        await playTrack(currentQuestion.track.uri)
      }
    }
  }

  const handleStopAudio = async () => {
    if (isIOSDevice && audioRef.current) {
      // Pause HTML5 audio on iOS
      audioRef.current.pause()
      setIsPlaying(false)
    } else if (playerRef.current) {
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
    const albumArtDelay = isIOSDevice ? 2000 : 4000
    setTimeout(() => {
      handleNextQuestion()
    }, albumArtDelay)
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
    const albumArtDelay = isIOSDevice ? 2000 : 4000
    setTimeout(() => {
      handleNextQuestion()
    }, albumArtDelay)
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
      if (isIOSDevice && audioRef.current) {
        audioRef.current.pause()
      } else if (playerRef.current) {
        playerRef.current.pause()
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

      {/* Scoreboards on left and right sides of middle section */}
      {gameStarted && (
        <>
          {/* Right scoreboard (rotated for teams on right side) */}
          <div className={`absolute top-1/2 -translate-y-1/2 z-40 ${teams.length === 6 ? 'right-40' : 'right-4'}`}>
            <ScoreBoard teams={teams} rotated />
          </div>
          {/* Left scoreboard (normal for teams on left side) */}
          <div className={`absolute top-1/2 -translate-y-1/2 z-40 ${teams.length === 6 ? 'left-40' : 'left-4'}`}>
            <ScoreBoard teams={teams} />
          </div>
          {/* Question counter below scoreboards on both sides */}
          {currentQuestion && (
            <>
              {[
                { side: 'left', className: teams.length === 6 ? 'left-40' : 'left-4' },
                { side: 'right', className: teams.length === 6 ? 'right-40 rotate-180' : 'right-4 rotate-180' }
              ].map(({ side, className }) => (
                <div key={side} className={`absolute top-[calc(50%+80px)] text-gray-400 text-sm z-40 ${className}`}>
                  Question {playedTrackIndices.size} of {tracks.length}
                </div>
              ))}
            </>
          )}
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
                {/* Play/Pause button - positioned at top of center zone, above scoreboard */}
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

                {/* Album art when answer is revealed */}
                {showAlbumArt && currentQuestion && (
                  <AlbumArtDisplay track={currentQuestion.track} />
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

                {/* Stage 2: Was the answer correct? */}
                {currentQuestion.type === 'buzz-in' && buzzedTeam && showAnswerPrompt && (
                  <div className="bg-gray-800/95 p-3 sm:p-6 rounded-xl max-w-xs sm:max-w-md mx-auto shadow-2xl border-2 border-white/30 backdrop-blur-sm">
                    <div className="text-sm sm:text-xl text-gray-300 mb-2 sm:mb-4 text-center">
                      Correct Answer: <span className="text-green-400 font-bold">{currentQuestion.correctAnswer}</span>
                    </div>
                    <div className="text-base sm:text-2xl font-bold text-white mb-3 sm:mb-6 text-center">
                      Did {teams.find(t => t.id === buzzedTeam)?.name} get the question right?
                    </div>
                    <div className="grid grid-cols-2 gap-2 sm:gap-4">
                      <button
                        onClick={handleBuzzCorrect}
                        className="bg-green-500 hover:bg-green-600 active:bg-green-700 text-white font-bold py-2 px-3 sm:py-4 sm:px-6 rounded-full text-base sm:text-xl transition-colors touch-manipulation"
                      >
                        ✓ Yes
                      </button>
                      <button
                        onClick={handleBuzzIncorrect}
                        className="bg-red-500 hover:bg-red-600 active:bg-red-700 text-white font-bold py-2 px-3 sm:py-4 sm:px-6 rounded-full text-base sm:text-xl transition-colors touch-manipulation"
                      >
                        ✗ No
                      </button>
                    </div>
                  </div>
                )}

                {/* No answer dialog */}
                {showNoAnswerDialog && !showReconnectDialog && (
                  <div className="bg-gray-800/95 p-3 sm:p-6 rounded-xl max-w-xs sm:max-w-md mx-auto shadow-2xl border-2 border-white/30 backdrop-blur-sm">
                    <div className="text-sm sm:text-xl text-gray-300 mb-2 sm:mb-4 text-center">
                      Correct Answer: <span className="text-green-400 font-bold">{currentQuestion.correctAnswer}</span>
                    </div>
                    <div className="text-base sm:text-2xl font-bold text-white mb-3 sm:mb-6 text-center">
                      Time's up! No one answered.
                    </div>
                    <button
                      onClick={handleNoAnswerContinue}
                      className="w-full bg-blue-500 hover:bg-blue-600 active:bg-blue-700 text-white font-bold py-2 px-4 sm:py-4 sm:px-8 rounded-full text-base sm:text-xl transition-colors touch-manipulation"
                    >
                      Continue
                    </button>
                  </div>
                )}

                {/* Reconnect Spotify dialog */}
                {showReconnectDialog && (
                  <div className="bg-gray-800/95 p-3 sm:p-6 rounded-xl max-w-xs sm:max-w-md mx-auto shadow-2xl border-2 border-yellow-500/50 backdrop-blur-sm">
                    <div className="text-base sm:text-2xl font-bold text-white mb-3 sm:mb-4 text-center">
                      🔌 Spotify Disconnected
                    </div>
                    <div className="text-xs sm:text-sm text-gray-300 mb-3 sm:mb-4 text-center">
                      1. Open Spotify app on your iPhone
                      <br />2. Play any song briefly
                      <br />3. Click "Reconnect" below
                    </div>
                    <button
                      onClick={reconnectSpotify}
                      disabled={reconnecting}
                      className="w-full bg-green-500 hover:bg-green-600 active:bg-green-700 disabled:bg-gray-500 text-white font-bold py-2 px-4 sm:py-3 sm:px-6 rounded-full text-sm sm:text-base transition-colors touch-manipulation mb-2"
                    >
                      {reconnecting ? '🔄 Reconnecting...' : '🔄 Reconnect Spotify'}
                    </button>
                    {availableDevices.length > 0 && (
                      <div className="text-xs text-gray-400 mt-2">
                        Found {availableDevices.length} device(s)
                      </div>
                    )}
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
