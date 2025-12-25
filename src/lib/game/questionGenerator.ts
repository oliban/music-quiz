import type { SpotifyTrack } from '../spotify/types'
import type { GameQuestion } from '@/src/store/gameStore'
import { LastFmClient } from '../lastfm/api'

export interface QuestionGeneratorOptions {
  tracks: SpotifyTrack[]
  lastFmApiKey?: string
}

export class QuestionGenerator {
  private tracks: SpotifyTrack[]
  private lastFmClient: LastFmClient | null

  constructor(options: QuestionGeneratorOptions) {
    this.tracks = options.tracks
    this.lastFmClient = options.lastFmApiKey
      ? new LastFmClient(options.lastFmApiKey)
      : null
  }

  async generateQuestion(currentTrack: SpotifyTrack, questionIndex: number): Promise<GameQuestion> {
    const questionType: 'buzz-in' | 'drag-to-corner' = questionIndex % 2 === 0 ? 'buzz-in' : 'drag-to-corner'

    if (questionType === 'buzz-in') {
      return this.generateBuzzInQuestion(currentTrack)
    } else {
      return await this.generateDragToCornerQuestion(currentTrack)
    }
  }

  private generateBuzzInQuestion(track: SpotifyTrack): GameQuestion {
    const questions = [
      {
        question: 'Name this song!',
        correctAnswer: track.name,
      },
      {
        question: 'Who is the artist?',
        correctAnswer: track.artists[0]?.name || 'Unknown',
      },
      {
        question: 'What album is this from?',
        correctAnswer: track.album?.name || 'Unknown',
      },
    ]

    const selected = questions[Math.floor(Math.random() * questions.length)]

    return {
      type: 'buzz-in',
      track,
      question: selected.question,
      correctAnswer: selected.correctAnswer,
    }
  }

  private async generateDragToCornerQuestion(track: SpotifyTrack): Promise<GameQuestion> {
    const questionTypes = [
      {
        question: 'Which is the correct song title?',
        correctAnswer: track.name,
        generateWrongAnswers: () => this.getRandomTrackNames(3, track.id),
      },
      {
        question: 'Who is the artist?',
        correctAnswer: track.artists[0]?.name || 'Unknown',
        generateWrongAnswers: () => this.getRandomArtists(3, track.artists[0]?.name),
      },
      {
        question: 'What album is this from?',
        correctAnswer: track.album?.name || 'Unknown',
        generateWrongAnswers: () => this.getRandomAlbums(3, track.album?.name),
      },
    ]

    const selected = questionTypes[Math.floor(Math.random() * questionTypes.length)]
    const wrongAnswers = selected.generateWrongAnswers()

    // Ensure we have at least 3 wrong answers by padding with generic options if needed
    while (wrongAnswers.length < 3) {
      wrongAnswers.push(`Option ${wrongAnswers.length + 1}`)
    }

    const options = this.shuffleArray([selected.correctAnswer, ...wrongAnswers.slice(0, 3)])

    return {
      type: 'drag-to-corner',
      track,
      question: selected.question,
      correctAnswer: selected.correctAnswer,
      options,
    }
  }

  private getRandomTrackNames(count: number, excludeId: string): string[] {
    const otherTracks = this.tracks.filter((t) => t.id !== excludeId)
    return this.getRandomItems(otherTracks, count).map((t) => t.name)
  }

  private getRandomArtists(count: number, excludeName?: string): string[] {
    const artists = this.tracks
      .flatMap((t) => t.artists)
      .filter((a) => a.name !== excludeName)
      .map((a) => a.name)
    const unique = [...new Set(artists)]
    return this.getRandomItems(unique, count)
  }

  private getRandomAlbums(count: number, excludeName?: string): string[] {
    const albums = this.tracks
      .map((t) => t.album?.name)
      .filter((name): name is string => name !== undefined && name !== excludeName)
    const unique = [...new Set(albums)]
    return this.getRandomItems(unique, count)
  }

  private getRandomItems<T>(array: T[], count: number): T[] {
    const shuffled = [...array].sort(() => Math.random() - 0.5)
    return shuffled.slice(0, Math.min(count, array.length))
  }

  private shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array]
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
    }
    return shuffled
  }
}
