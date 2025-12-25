export interface LastFmTrackInfo {
  artist: string
  name: string
  album?: string
  wiki?: {
    summary: string
    content: string
  }
  tags?: Array<{ name: string }>
}

export class LastFmClient {
  private apiKey: string
  private baseUrl = 'https://ws.audioscrobbler.com/2.0/'

  constructor(apiKey: string) {
    this.apiKey = apiKey
  }

  async getTrackInfo(artist: string, track: string): Promise<LastFmTrackInfo | null> {
    try {
      const params = new URLSearchParams({
        method: 'track.getInfo',
        api_key: this.apiKey,
        artist,
        track,
        format: 'json',
        autocorrect: '1',
      })

      const response = await fetch(`${this.baseUrl}?${params}`)
      const data = await response.json()

      if (data.error) {
        console.error('Last.fm API error:', data.message)
        return null
      }

      return {
        artist: data.track?.artist?.name || artist,
        name: data.track?.name || track,
        album: data.track?.album?.title,
        wiki: data.track?.wiki,
        tags: data.track?.toptags?.tag || [],
      }
    } catch (error) {
      console.error('Failed to fetch track info from Last.fm:', error)
      return null
    }
  }

  async searchSimilarArtists(artist: string, limit: number = 5): Promise<string[]> {
    try {
      const params = new URLSearchParams({
        method: 'artist.getSimilar',
        api_key: this.apiKey,
        artist,
        limit: limit.toString(),
        format: 'json',
        autocorrect: '1',
      })

      const response = await fetch(`${this.baseUrl}?${params}`)
      const data = await response.json()

      if (data.error) {
        return []
      }

      return (data.similarartists?.artist || []).map((a: any) => a.name)
    } catch (error) {
      console.error('Failed to fetch similar artists from Last.fm:', error)
      return []
    }
  }
}
