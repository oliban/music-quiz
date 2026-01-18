import { MongoClient, Db } from 'mongodb'

let cachedClient: MongoClient | null = null
let cachedDb: Db | null = null

export async function connectToDatabase() {
  if (cachedClient && cachedDb) {
    return { client: cachedClient, db: cachedDb }
  }

  const uri = process.env.MONGODB_URI
  if (!uri) {
    throw new Error('MONGODB_URI environment variable not set')
  }

  console.log('🔗 Attempting MongoDB connection...')

  try {
    // Let MongoDB driver handle TLS automatically for +srv URIs
    const client = new MongoClient(uri, {
      serverSelectionTimeoutMS: 10000,
      maxPoolSize: 10,
    })

    await client.connect()
    const db = client.db('mixtape-duel')

    cachedClient = client
    cachedDb = db

    console.log('✅ MongoDB connected successfully')

    return { client, db }
  } catch (error: any) {
    console.error('❌ MongoDB connection failed:', {
      message: error.message,
      code: error.code,
      name: error.name,
    })
    throw error
  }
}
