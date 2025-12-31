import { NextRequest, NextResponse } from 'next/server'
import { connectToDatabase } from '../db'

export async function POST(request: NextRequest) {
  try {
    const { songIds } = await request.json()

    if (!Array.isArray(songIds) || songIds.length === 0) {
      return NextResponse.json({ error: 'songIds array required' }, { status: 400 })
    }

    const { db } = await connectToDatabase()
    const collection = db.collection('trivia_questions')

    // Find which songs have trivia
    const songsWithTrivia = await collection
      .find(
        { songSpotifyId: { $in: songIds } },
        { projection: { songSpotifyId: 1 } }
      )
      .toArray()

    const idsWithTrivia = songsWithTrivia.map(doc => doc.songSpotifyId)

    return NextResponse.json({ idsWithTrivia })
  } catch (error: any) {
    console.error('Error checking trivia:', error)
    return NextResponse.json(
      { error: error.message || 'Check failed' },
      { status: 500 }
    )
  }
}
