import { describe, test, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { PlaylistSearch } from '../PlaylistSearch'

describe('PlaylistSearch', () => {
  const mockAccessToken = 'mock-token'
  const mockOnSelect = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  test('renders search input', () => {
    const mockFetcher = vi.fn()
    render(
      <PlaylistSearch
        accessToken={mockAccessToken}
        onSelect={mockOnSelect}
        fetcher={mockFetcher}
      />
    )
    expect(screen.getByPlaceholderText(/search for playlists/i)).toBeInTheDocument()
  })

  test('displays results after search', async () => {
    const mockPlaylists = [
      {
        id: 'playlist-1',
        name: 'Rock Classics',
        images: [{ url: 'https://example.com/image.jpg' }],
        tracks: { total: 50 },
      },
    ]

    const mockFetcher = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ playlists: mockPlaylists }),
    })

    const user = userEvent.setup()
    render(
      <PlaylistSearch
        accessToken={mockAccessToken}
        onSelect={mockOnSelect}
        fetcher={mockFetcher}
      />
    )

    const input = screen.getByPlaceholderText(/search for playlists/i)
    await user.type(input, 'rock')

    await waitFor(() => {
      expect(screen.getByText('Rock Classics')).toBeInTheDocument()
    })

    expect(mockFetcher).toHaveBeenCalledWith(
      expect.stringContaining('/api/spotify/search?q=rock')
    )
  })

  test('selects playlist on click', async () => {
    const mockPlaylists = [
      {
        id: 'playlist-1',
        name: 'Rock Classics',
        images: [{ url: 'https://example.com/image.jpg' }],
        tracks: { total: 50 },
      },
    ]

    const mockFetcher = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ playlists: mockPlaylists }),
    })

    const user = userEvent.setup()
    render(
      <PlaylistSearch
        accessToken={mockAccessToken}
        onSelect={mockOnSelect}
        fetcher={mockFetcher}
      />
    )

    const input = screen.getByPlaceholderText(/search for playlists/i)
    await user.type(input, 'rock')

    await waitFor(() => {
      expect(screen.getByText('Rock Classics')).toBeInTheDocument()
    })

    const playlistButton = screen.getByText('Rock Classics').closest('button')
    await user.click(playlistButton!)

    expect(mockOnSelect).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Rock Classics',
      })
    )
  })

  test('shows "no playlists found" when no results', async () => {
    const mockFetcher = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ playlists: [] }),
    })

    const user = userEvent.setup()
    render(
      <PlaylistSearch
        accessToken={mockAccessToken}
        onSelect={mockOnSelect}
        fetcher={mockFetcher}
      />
    )

    const input = screen.getByPlaceholderText(/search for playlists/i)
    await user.type(input, 'nonexistent')

    await waitFor(() => {
      expect(screen.getByText(/no playlists found/i)).toBeInTheDocument()
    })
  })
})
