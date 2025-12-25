import { describe, test, expect, beforeEach } from 'vitest'
import { useGameStore } from '../gameStore'
import type { Team } from '../gameStore'

describe('Game Store', () => {
  beforeEach(() => {
    // Reset store before each test
    useGameStore.getState().reset()
  })

  test('initializes with empty state', () => {
    const state = useGameStore.getState()
    expect(state.playlist).toBeNull()
    expect(state.teams).toEqual([])
    expect(state.touchZones).toEqual([])
    expect(state.gameStarted).toBe(false)
  })

  test('sets playlist', () => {
    const mockPlaylist = {
      id: 'playlist-1',
      name: 'Test Playlist',
      images: [],
      tracks: { total: 50 },
    }

    useGameStore.getState().setPlaylist(mockPlaylist)
    expect(useGameStore.getState().playlist).toEqual(mockPlaylist)
  })

  test('sets teams', () => {
    const mockTeams: Team[] = [
      { id: 'team-1', name: 'Team 1', score: 0, color: '#3B82F6' },
      { id: 'team-2', name: 'Team 2', score: 0, color: '#EF4444' },
    ]

    useGameStore.getState().setTeams(mockTeams)
    expect(useGameStore.getState().teams).toEqual(mockTeams)
  })

  test('sets up touch zones based on team count', () => {
    const mockTeams: Team[] = [
      { id: 'team-1', name: 'Team 1', score: 0, color: '#3B82F6' },
      { id: 'team-2', name: 'Team 2', score: 0, color: '#EF4444' },
      { id: 'team-3', name: 'Team 3', score: 0, color: '#10B981' },
      { id: 'team-4', name: 'Team 4', score: 0, color: '#F59E0B' },
    ]

    useGameStore.getState().setTeams(mockTeams)
    useGameStore.getState().setupTouchZones()

    const zones = useGameStore.getState().touchZones
    expect(zones).toHaveLength(4)
    expect(zones.map((z) => z.position)).toEqual([
      'top-left',
      'top-right',
      'bottom-left',
      'bottom-right',
    ])
  })

  test('updates team score', () => {
    const mockTeams: Team[] = [
      { id: 'team-1', name: 'Team 1', score: 0, color: '#3B82F6' },
      { id: 'team-2', name: 'Team 2', score: 0, color: '#EF4444' },
    ]

    useGameStore.getState().setTeams(mockTeams)
    useGameStore.getState().updateScore('team-1', 10)

    const teams = useGameStore.getState().teams
    expect(teams[0].score).toBe(10)
    expect(teams[1].score).toBe(0)
  })

  test('starts game', () => {
    useGameStore.getState().startGame()
    expect(useGameStore.getState().gameStarted).toBe(true)
  })

  test('resets state', () => {
    const mockTeams: Team[] = [
      { id: 'team-1', name: 'Team 1', score: 10, color: '#3B82F6' },
    ]

    useGameStore.getState().setTeams(mockTeams)
    useGameStore.getState().startGame()
    useGameStore.getState().reset()

    const state = useGameStore.getState()
    expect(state.teams).toEqual([])
    expect(state.gameStarted).toBe(false)
  })
})
