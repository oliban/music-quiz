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
}
