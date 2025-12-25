export interface SpotifyImage {
  url: string
  height?: number
  width?: number
}

export interface SpotifyArtist {
  id: string
  name: string
  uri?: string
}

export interface SpotifyAlbum {
  id: string
  name: string
  release_date: string
  images: SpotifyImage[]
}

export interface SpotifyTrack {
  id: string
  name: string
  artists: SpotifyArtist[]
  album: SpotifyAlbum
  preview_url: string | null
  duration_ms: number
  uri?: string
}

export interface SpotifyPlaylist {
  id: string
  name: string
  description?: string
  images: SpotifyImage[]
  tracks?: {
    total: number
  }
}

export interface SpotifySearchResponse {
  playlists: {
    items: SpotifyPlaylist[]
  }
}

export interface SpotifyPlaylistTracksResponse {
  items: Array<{
    track: SpotifyTrack
  }>
}
