import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { SpotifyPlaylist, SpotifyTrack } from '@/src/lib/spotify/types'

export interface Team {
  id: string
  name: string
  score: number
  color: string
  buzzerSound: string
}

export interface TouchZone {
  id: string
  teamId: string
  position: 'center-top' | 'center-bottom'
  color: string
}

export interface GameQuestion {
  type: 'buzz-in' | 'drag-to-corner'
  track: SpotifyTrack
  question: string
  correctAnswer: string
  options?: string[]
  optionRevealDelays?: number[]  // Delays in seconds for staggered option reveals
}

interface GameState {
  // Setup
  playlist: SpotifyPlaylist | null
  teams: Team[]
  touchZones: TouchZone[]

  // Game state
  currentQuestion: GameQuestion | null
  currentTrackIndex: number
  gameStarted: boolean
  questionStartTime: number | null

  // Actions
  setPlaylist: (playlist: SpotifyPlaylist) => void
  setTeams: (teams: Team[]) => void
  setupTouchZones: () => void
  startGame: () => void
  nextQuestion: () => void
  updateScore: (teamId: string, points: number) => void
  reset: () => void
}

const TEAM_COLORS = [
  '#3B82F6', // blue
  '#EF4444', // red
]

const getZonePositions = (): TouchZone['position'][] => {
  return ['center-top', 'center-bottom']
}

export const useGameStore = create<GameState>()(
  persist(
    (set, get) => ({
      // Initial state
      playlist: null,
      teams: [],
      touchZones: [],
      currentQuestion: null,
      currentTrackIndex: 0,
      gameStarted: false,
      questionStartTime: null,

      // Actions
      setPlaylist: (playlist) => set({ playlist }),

      setTeams: (teams) => set({ teams }),

      setupTouchZones: () => {
        const { teams } = get()
        const positions = getZonePositions()

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
      onRehydrateStorage: () => (state) => {
        // Migration: Reset state if old version had more than 2 teams
        if (state && state.teams.length !== 2 && state.teams.length > 0) {
          console.log('Migrating: Resetting state due to team count change')
          state.teams = []
          state.touchZones = []
          state.playlist = null
          state.gameStarted = false
          state.currentQuestion = null
          state.currentTrackIndex = 0
        }

        // Migration: Update old color-based buzzer sound file paths to new descriptive names
        if (state && state.teams.length > 0) {
          const buzzerMigrationMap: Record<string, string> = {
            '/sounds/buzzer-blue.mp3': '/sounds/buzzer-1.mp3',
            '/sounds/buzzer-red.mp3': '/sounds/buzzer-2.mp3',
            '/sounds/buzzer-teal.mp3': '/sounds/buzzer-bell.mp3',
            '/sounds/buzzer-pink.mp3': '/sounds/buzzer-gameshow.mp3',
            '/sounds/buzzer-green.mp3': '/sounds/buzzer-horn.mp3',
            '/sounds/buzzer-purple.mp3': '/sounds/buzzer-ding.mp3',
            '/sounds/buzzer-yellow.mp3': '/sounds/buzzer-beep.mp3',
          }

          state.teams = state.teams.map(team => ({
            ...team,
            buzzerSound: buzzerMigrationMap[team.buzzerSound] || team.buzzerSound
          }))
        }
      },
    }
  )
)
