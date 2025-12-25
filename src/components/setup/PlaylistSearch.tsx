'use client'

import { useState } from 'react'
import type { SpotifyPlaylist } from '@/src/lib/spotify/types'

interface PlaylistSearchProps {
  accessToken: string
  onSelect: (playlist: SpotifyPlaylist) => void
  fetcher?: (url: string) => Promise<Response>
}

export function PlaylistSearch({ accessToken, onSelect, fetcher = fetch }: PlaylistSearchProps) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SpotifyPlaylist[]>([])
  const [loading, setLoading] = useState(false)
  const [selected, setSelected] = useState<SpotifyPlaylist | null>(null)

  const handleSearch = async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setResults([])
      return
    }

    setLoading(true)
    try {
      const url = `/api/spotify/search?q=${encodeURIComponent(searchQuery)}`
      const response = await fetcher(url)
      const data = await response.json()
      setResults(data.playlists || [])
    } catch (error) {
      console.error('Search error:', error)
      setResults([])
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setQuery(value)
    handleSearch(value)
  }

  const handleSelect = (playlist: SpotifyPlaylist) => {
    setSelected(playlist)
    onSelect(playlist)
  }

  return (
    <div className="w-full max-w-2xl mx-auto p-4">
      <div className="mb-6">
        <input
          type="text"
          placeholder="Search for playlists..."
          value={query}
          onChange={handleInputChange}
          className="w-full px-4 py-3 text-lg border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-black"
        />
      </div>

      {loading && (
        <div className="text-center py-8">
          <p className="text-white">Searching...</p>
        </div>
      )}

      {!loading && results.length > 0 && (
        <div className="space-y-2">
          {results.map((playlist) => (
            <button
              key={playlist.id}
              onClick={() => handleSelect(playlist)}
              className={`w-full p-4 rounded-lg text-left transition-colors ${
                selected?.id === playlist.id
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-800 text-white hover:bg-gray-700'
              }`}
            >
              <div className="flex items-center gap-4">
                {playlist.images?.[0]?.url && (
                  <img
                    src={playlist.images[0].url}
                    alt={playlist.name}
                    className="w-16 h-16 rounded object-cover"
                  />
                )}
                <div>
                  <h3 className="font-bold text-lg">{playlist.name}</h3>
                  {playlist.description && (
                    <p className="text-sm text-gray-300">{playlist.description}</p>
                  )}
                  {playlist.tracks && (
                    <p className="text-sm text-gray-400">{playlist.tracks.total} tracks</p>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {!loading && query && results.length === 0 && (
        <div className="text-center py-8">
          <p className="text-gray-400">No playlists found</p>
        </div>
      )}
    </div>
  )
}
