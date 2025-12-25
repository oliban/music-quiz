import { describe, test, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { PlaylistSearch } from '../PlaylistSearch'

describe('PlaylistSearch Simple Tests', () => {
  const mockAccessToken = 'mock-token'
  const mockOnSelect = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  test('renders search input', () => {
    render(<PlaylistSearch accessToken={mockAccessToken} onSelect={mockOnSelect} />)
    const input = screen.getByPlaceholderText(/search for playlists/i)
    expect(input).toBeInTheDocument()
    expect(input).toHaveValue('')
  })

  test('can type in search input', async () => {
    const user = userEvent.setup()
    render(<PlaylistSearch accessToken={mockAccessToken} onSelect={mockOnSelect} />)

    const input = screen.getByPlaceholderText(/search for playlists/i)
    await user.type(input, 'test query')

    expect(input).toHaveValue('test query')
  })
})
