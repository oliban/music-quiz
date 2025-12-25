import { describe, test, expect, beforeEach } from 'vitest'
import { QuestionGenerator } from '../questionGenerator'
import type { SpotifyTrack } from '../../spotify/types'

const mockTracks: SpotifyTrack[] = [
  {
    id: 'track-1',
    name: 'Bohemian Rhapsody',
    artists: [{ name: 'Queen', id: 'artist-1' }],
    album: { name: 'A Night at the Opera', id: 'album-1' },
    duration_ms: 354000,
    preview_url: 'https://example.com/preview1.mp3',
  },
  {
    id: 'track-2',
    name: 'Stairway to Heaven',
    artists: [{ name: 'Led Zeppelin', id: 'artist-2' }],
    album: { name: 'Led Zeppelin IV', id: 'album-2' },
    duration_ms: 482000,
    preview_url: 'https://example.com/preview2.mp3',
  },
  {
    id: 'track-3',
    name: 'Hotel California',
    artists: [{ name: 'Eagles', id: 'artist-3' }],
    album: { name: 'Hotel California', id: 'album-3' },
    duration_ms: 391000,
    preview_url: 'https://example.com/preview3.mp3',
  },
]

describe('QuestionGenerator', () => {
  let generator: QuestionGenerator

  beforeEach(() => {
    generator = new QuestionGenerator({ tracks: mockTracks })
  })

  test('generates buzz-in question', async () => {
    const question = await generator.generateQuestion(mockTracks[0], 0)

    expect(question.type).toBe('buzz-in')
    expect(question.track).toEqual(mockTracks[0])
    expect(question.question).toBeTruthy()
    expect(question.correctAnswer).toBeTruthy()
    expect(['Bohemian Rhapsody', 'Queen', 'A Night at the Opera']).toContain(
      question.correctAnswer
    )
  })

  test('generates drag-to-corner question', async () => {
    const question = await generator.generateQuestion(mockTracks[0], 1)

    expect(question.type).toBe('drag-to-corner')
    expect(question.track).toEqual(mockTracks[0])
    expect(question.question).toBeTruthy()
    expect(question.correctAnswer).toBeTruthy()
    expect(question.options).toHaveLength(4)
    expect(question.options).toContain(question.correctAnswer)
  })

  test('alternates between question types', async () => {
    const q1 = await generator.generateQuestion(mockTracks[0], 0)
    const q2 = await generator.generateQuestion(mockTracks[1], 1)
    const q3 = await generator.generateQuestion(mockTracks[2], 2)

    expect(q1.type).toBe('buzz-in')
    expect(q2.type).toBe('drag-to-corner')
    expect(q3.type).toBe('buzz-in')
  })

  test('drag-to-corner options are unique', async () => {
    const question = await generator.generateQuestion(mockTracks[0], 1)

    if (question.options) {
      const uniqueOptions = new Set(question.options)
      expect(uniqueOptions.size).toBe(question.options.length)
    }
  })
})
