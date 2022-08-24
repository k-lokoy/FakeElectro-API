import { Db, MongoClient } from 'mongodb'

if ('test' !== process.env.NODE_ENV && !process.env.MONGODB_CONNECTION_STRING)
  throw new Error('Missing database connection string.')

export const client = new MongoClient(
  'test' === process.env.NODE_ENV
    ? global.__MONGO_URI__
    : process.env.MONGODB_CONNECTION_STRING
)

let db: Db
export async function getDb() {
  if (db) return db

  const connectedClient = await client.connect()
  
  db = connectedClient.db(
    'test' === process.env.NODE_ENV
    ? globalThis.__MONGO_DB_NAME__
    : process.env.MONGODB_DB_NAME
  )

  return db
}
