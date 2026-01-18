import { NextResponse } from 'next/server'
import { connectToDatabase } from '../db'

export async function GET() {
  try {
    console.log('Testing MongoDB connection...')
    const { db } = await connectToDatabase()

    // Try a simple operation
    const collections = await db.listCollections().toArray()

    return NextResponse.json({
      success: true,
      message: 'MongoDB connection successful',
      collections: collections.map(c => c.name),
    })
  } catch (error: any) {
    console.error('MongoDB connection test failed:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message,
        code: error.code,
        name: error.name,
      },
      { status: 500 }
    )
  }
}
