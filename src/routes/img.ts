import { Router } from 'express'
import { GridFSBucket, ObjectId } from 'mongodb'

import { clientPromise } from '../database'

const imgRouter = Router()

imgRouter.get('/:id', async function(req, res) {
  try {
    const id = new ObjectId(req.params.id.split('.')?.[0])
    const client = await clientPromise
    const db = client.db(process.env.MONGODB_DB_NAME)
    const bucket = new GridFSBucket(db, {bucketName: 'images'})
    const downloadStream = bucket.openDownloadStream(id)
    
    downloadStream.on('data',  (data) => res.status(200).write(data))
    downloadStream.on('error', (err)  => res.sendStatus(404))
    downloadStream.on('end',   ()     => res.end())
  
  } catch (err) {
    console.error(req.method, req.originalUrl, err)
    res.sendStatus(500)
  }
})

export default imgRouter