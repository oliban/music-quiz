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

export interface GameResult {
  id: string
  date: string
  playlistName: string
  teams: {
    name: string
    score: number
  }[]
  winner: string
  totalQuestions: number
  endReason?: 'score_limit' | 'tracks_exhausted'
  winningScore?: number
}

export interface TeamStats {
  teamName: string
  wins: number
  losses: number
  totalGames: number
  totalScore: number
  averageScore: number
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

  // History
  gameHistory: GameResult[]

  // Actions
  setPlaylist: (playlist: SpotifyPlaylist) => void
  setTeams: (teams: Team[]) => void
  setupTouchZones: () => void
  startGame: () => void
  nextQuestion: () => void
  updateScore: (teamId: string, points: number) => void
  saveGameResult: (totalQuestions: number, endReason?: 'score_limit' | 'tracks_exhausted', winningScore?: number) => void
  getTeamStats: (teamName: string) => TeamStats
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
      gameHistory: [],

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
              ? { ...team, score: Math.max(0, team.score + points) }
              : team
          ),
        }))
      },

      saveGameResult: (
        totalQuestions: number,
        endReason: 'score_limit' | 'tracks_exhausted' = 'tracks_exhausted',
        winningScore?: number
      ) => {
        const { playlist, teams, gameHistory } = get()
        if (!playlist || teams.length === 0) return

        // Determine winner
        const sortedTeams = [...teams].sort((a, b) => b.score - a.score)
        const winner = sortedTeams[0].name

        const gameResult: GameResult = {
          id: `game-${Date.now()}`,
          date: new Date().toISOString(),
          playlistName: playlist.name,
          teams: teams.map(t => ({ name: t.name, score: t.score })),
          winner,
          totalQuestions,
          endReason,
          winningScore: winningScore ?? sortedTeams[0].score,
        }

        set({ gameHistory: [gameResult, ...gameHistory].slice(0, 50) }) // Keep last 50 games
      },

      getTeamStats: (teamName) => {
        const { gameHistory } = get()
        const teamGames = gameHistory.filter(game =>
          game.teams.some(t => t.name === teamName)
        )

        const wins = teamGames.filter(game => game.winner === teamName).length
        const totalGames = teamGames.length
        const losses = totalGames - wins
        const totalScore = teamGames.reduce((sum, game) => {
          const teamData = game.teams.find(t => t.name === teamName)
          return sum + (teamData?.score || 0)
        }, 0)
        const averageScore = totalGames > 0 ? totalScore / totalGames : 0

        return {
          teamName,
          wins,
          losses,
          totalGames,
          totalScore,
          averageScore,
        }
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

        // Migration: Add default endReason to old game history entries
        if (state && state.gameHistory.length > 0) {
          state.gameHistory = state.gameHistory.map(game => ({
            ...game,
            endReason: game.endReason || 'tracks_exhausted',
            winningScore: game.winningScore !== undefined ? game.winningScore : undefined
          }))
        }
      },
    }
  )
)
