import multer from 'multer'
import { GridFsStorage } from 'multer-gridfs-storage'

import { dbPromise } from '../database'

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