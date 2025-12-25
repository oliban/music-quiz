import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { SpotifyPlaylist, SpotifyTrack } from '@/src/lib/spotify/types'

export interface Team {
  id: string
  name: string
  score: number
  color: string
}

export interface TouchZone {
  id: string
  teamId: string
  position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center-top' | 'center-bottom' | 'left-middle' | 'right-middle'
  color: string
}

export interface GameQuestion {
  type: 'buzz-in' | 'drag-to-corner'
  track: SpotifyTrack
  question: string
  correctAnswer: string
  options?: string[]
}

interface GameState {
  // Setup
  playlist: SpotifyPlaylist | null
  teams: Team[]
  touchZones: TouchZone[]
  spotifyDeviceId: string | null
  spotifyDeviceName: string | null

  // Game state
  currentQuestion: GameQuestion | null
  currentTrackIndex: number
  gameStarted: boolean
  questionStartTime: number | null

  // Actions
  setPlaylist: (playlist: SpotifyPlaylist) => void
  setTeams: (teams: Team[]) => void
  setupTouchZones: () => void
  setSpotifyDevice: (deviceId: string, deviceName: string) => void
  startGame: () => void
  nextQuestion: () => void
  updateScore: (teamId: string, points: number) => void
  reset: () => void
}

const TEAM_COLORS = [
  '#3B82F6', // blue
  '#EF4444', // red
  '#10B981', // green
  '#F59E0B', // yellow
  '#8B5CF6', // purple
  '#EC4899', // pink
  '#14B8A6', // teal
]

const getZonePositions = (teamCount: number): TouchZone['position'][] => {
  switch (teamCount) {
    case 2:
      return ['top-left', 'bottom-right']
    case 3:
      return ['top-left', 'top-right', 'center-bottom']
    case 4:
      return ['top-left', 'top-right', 'bottom-left', 'bottom-right']
    case 5:
      return ['top-left', 'top-right', 'bottom-left', 'bottom-right', 'center-bottom']
    case 6:
      return ['top-left', 'top-right', 'bottom-left', 'bottom-right', 'left-middle', 'right-middle']
    case 7:
      return ['top-left', 'top-right', 'bottom-left', 'bottom-right', 'left-middle', 'right-middle', 'center-bottom']
    default:
      return []
  }
}

export const useGameStore = create<GameState>()(
  persist(
    (set, get) => ({
      // Initial state
      playlist: null,
      teams: [],
      touchZones: [],
      spotifyDeviceId: null,
      spotifyDeviceName: null,
      currentQuestion: null,
      currentTrackIndex: 0,
      gameStarted: false,
      questionStartTime: null,

      // Actions
      setPlaylist: (playlist) => set({ playlist }),

      setTeams: (teams) => set({ teams }),

      setSpotifyDevice: (deviceId, deviceName) =>
        set({ spotifyDeviceId: deviceId, spotifyDeviceName: deviceName }),

      setupTouchZones: () => {
        const { teams } = get()
        const positions = getZonePositions(teams.length)

        const zones: TouchZone[] = teams.map((team, index) => ({
          id: `zone-${team.id}`,
          teamId: team.id,
          position: positions[index],
          color: team.color,
        }))

        set({ touchZones: zones })
      },

      startGame: () => set({ gameStarted: true }),

      nextQuestion: () => {
        const { currentTrackIndex } = get()
        set({ currentTrackIndex: currentTrackIndex + 1 })
      },

      updateScore: (teamId, points) => {
        set((state) => ({
          teams: state.teams.map((team) =>
            team.id === teamId
              ? { ...team, score: team.score + points }
              : team
          ),
        }))
      },

      reset: () =>
        set({
          playlist: null,
          teams: [],
          touchZones: [],
          currentQuestion: null,
          currentTrackIndex: 0,
          gameStarted: false,
          questionStartTime: null,
        }),
    }),
    {
      name: 'music-quiz-game',
    }
  )
)
