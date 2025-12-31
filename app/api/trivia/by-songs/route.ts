import { NextRequest, NextResponse } from 'next/server'
import { connectToDatabase } from '../db'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const songIds = searchParams.get('ids')?.split(',') || []
    const categories = searchParams.get('categories')?.split(',')

    if (songIds.length === 0) {
      return NextResponse.json({ error: 'ids parameter required' }, { status: 400 })
    }

    const { db } = await connectToDatabase()
    const collection = db.collection('trivia_questions')

    const query: any = { songSpotifyId: { $in: songIds } }

    // Fetch trivia data
    let triviaData = await collection.find(query).toArray()

    // Filter by categories if specified
    if (categories && categories.length > 0) {
      triviaData = triviaData.map(doc => ({
        ...doc,
        questions: doc.questions.filter((q: any) => categories.includes(q.category)),
      }))
    }

    return NextResponse.json({ trivia: triviaData })
  } catch (error) {
    console.error('Error fetching trivia:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
