import { describe, test, expect, vi, beforeEach } from 'vitest'
import { SpotifyClient } from '../api'

// Mock fetch globally
global.fetch = vi.fn()

describe('Spotify API Client', () => {
  const mockAccessToken = 'mock-access-token'
  let client: SpotifyClient

  beforeEach(() => {
    vi.clearAllMocks()
    client = new SpotifyClient(mockAccessToken)
  })

  test('searchPlaylists returns playlist data', async () => {
    const mockResponse = {
      playlists: {
        items: Array(20).fill({
          name: 'Rock Classics',
          id: 'playlist-id-123',
          images: [{ url: 'https://example.com/image.jpg' }],
        }),
      },
    }

    ;(global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    })

    const results = await client.searchPlaylists('rock')

    expect(results).toHaveLength(20)
    expect(results[0]).toHaveProperty('name')
    expect(results[0]).toHaveProperty('id')
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('search'),
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: `Bearer ${mockAccessToken}`,
        }),
      })
    )
  })

  test('getTrack returns track with preview_url', async () => {
    const mockTrack = {
      id: 'track-123',
      name: 'Test Song',
      artists: [{ name: 'Test Artist', id: 'artist-123' }],
      album: {
        name: 'Test Album',
        release_date: '2020-01-01',
        images: [{ url: 'https://example.com/album.jpg' }],
      },
      preview_url: 'https://example.com/preview.mp3',
      duration_ms: 180000,
    }

    ;(global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockTrack,
    })

    const track = await client.getTrack('track-123')

    expect(track.preview_url).toBeDefined()
    expect(track.artists.length).toBeGreaterThan(0)
    expect(track.name).toBe('Test Song')
  })

  test('getPlaylistTracks returns tracks from playlist', async () => {
    const mockResponse = {
      items: [
        {
          track: {
            id: 'track-1',
            name: 'Song 1',
            artists: [{ name: 'Artist 1', id: 'artist-1' }],
            album: {
              name: 'Album 1',
              release_date: '2020-01-01',
              images: []
            },
            preview_url: 'https://example.com/preview1.mp3',
            duration_ms: 180000,
          },
        },
      ],
    }

    ;(global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    })

    const tracks = await client.getPlaylistTracks('playlist-123')

    expect(tracks).toHaveLength(1)
    expect(tracks[0].name).toBe('Song 1')
  })

  test('handles API errors gracefully', async () => {
    ;(global.fetch as any).mockResolvedValueOnce({
      ok: false,
      status: 401,
      statusText: 'Unauthorized',
    })

    await expect(client.searchPlaylists('test')).rejects.toThrow()
  })
})
