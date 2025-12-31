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

  const client = new MongoClient(uri, {
    serverSelectionTimeoutMS: 5000,
    maxPoolSize: 10,
  })

  await client.connect()
  const db = client.db('mixtape-duel')

  cachedClient = client
  cachedDb = db

  return { client, db }
}
