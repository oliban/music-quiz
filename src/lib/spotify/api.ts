import type {
  SpotifyPlaylist,
  SpotifyTrack,
  SpotifySearchResponse,
  SpotifyPlaylistTracksResponse,
} from './types'

export class SpotifyClient {
  private accessToken: string
  private baseUrl = 'https://api.spotify.com/v1'

  constructor(accessToken: string) {
    this.accessToken = accessToken
  }

  private async request<T>(endpoint: string): Promise<T> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      throw new Error(`Spotify API error: ${response.status} ${response.statusText}`)
    }

    return response.json()
  }

  async searchPlaylists(query: string): Promise<SpotifyPlaylist[]> {
    const response = await this.request<SpotifySearchResponse>(
      `/search?q=${encodeURIComponent(query)}&type=playlist&limit=20`
    )
    // Filter out null items (Spotify API can return nulls for unavailable playlists)
    return response.playlists.items.filter((item): item is SpotifyPlaylist => item !== null)
  }

  async getTrack(trackId: string): Promise<SpotifyTrack> {
    return this.request<SpotifyTrack>(`/tracks/${trackId}`)
  }

  async getPlaylistTracks(playlistId: string): Promise<SpotifyTrack[]> {
    const response = await this.request<SpotifyPlaylistTracksResponse>(
      `/playlists/${playlistId}/tracks`
    )
    // Filter out null tracks (Spotify API can return nulls for unavailable tracks)
    return response.items
      .map((item) => item.track)
      .filter((track): track is SpotifyTrack => track !== null)
  }

  async getPreviewUrls(trackIds: string[]): Promise<Map<string, string | null>> {
    if (trackIds.length === 0) {
      return new Map()
    }

    const resultMap = new Map<string, string | null>()
    const BATCH_SIZE = 50 // API route allows max 50 tracks per request

    try {
      // Split into batches of 50
      const batches: string[][] = []
      for (let i = 0; i < trackIds.length; i += BATCH_SIZE) {
        batches.push(trackIds.slice(i, i + BATCH_SIZE))
      }

      // Process all batches in parallel
      const batchPromises = batches.map(async (batch) => {
        const idsParam = batch.join(',')
        const response = await fetch(`/api/spotify/preview?trackIds=${idsParam}`, {
          headers: {
            'ngrok-skip-browser-warning': 'true',
          },
        })

        if (!response.ok) {
          return new Map()
        }

        const data = await response.json()
        const batchMap = new Map<string, string | null>()

        for (const [trackId, result] of Object.entries(data.previews)) {
          batchMap.set(trackId, (result as any).preview_url)
        }

        return batchMap
      })

      // Wait for all batches to complete
      const batchResults = await Promise.all(batchPromises)

      // Merge all results
      for (const batchMap of batchResults) {
        for (const [trackId, previewUrl] of batchMap.entries()) {
          resultMap.set(trackId, previewUrl)
        }
      }

      return resultMap
    } catch (error) {
      return resultMap // Return whatever we got so far
    }
  }
}
