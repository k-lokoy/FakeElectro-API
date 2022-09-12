import multer from 'multer'
import { GridFsStorage } from 'multer-gridfs-storage'
import { MongoClient } from 'mongodb'

const dbPromise =
  MongoClient
    .connect(process.env.MONGODB_CONNECTION_STRING)
    .then(client => client.db(process.env.MONGODB_DB_NAME))

const storage = new GridFsStorage({
  url: process.env.MONGODB_CONNECTION_STRING,
  db: dbPromise,
  options: {
    useNewUrlParser: true,
    useUnifiedTopology: true
  },
  file: (req, file) => ({
    bucketName: ['image/png', 'image/jpeg'].includes(file.mimetype) ? 'images' : 'files',
    filename: file.originalname,
  })
})

export default multer({ storage })