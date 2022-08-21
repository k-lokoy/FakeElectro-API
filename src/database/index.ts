import { MongoClient } from 'mongodb'

if (!process.env.MONGODB_CONNECTION_STRING)
  throw new Error('Missing database connection string.')

const client = new MongoClient(process.env.MONGODB_CONNECTION_STRING)
const clientPromise = client.connect()
const dbPromise = clientPromise.then(client => client.db(process.env.MONGODB_DB_NAME))

export { clientPromise, dbPromise }