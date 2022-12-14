import { Router } from 'express'
import { GridFSBucket, ObjectId } from 'mongodb'
import mongoose from 'mongoose'
import jwtAuthz from 'express-jwt-authz'

import checkJwt from '../middleware/checkJwt'
import uploadMiddleware from '../middleware/upload'

const imageRouter = Router()

imageRouter.get('/:id', async function(req, res) {
  try {
    const id = new ObjectId(req.params.id.split('.')?.[0])
    const bucket = new GridFSBucket(mongoose.connection.db, {bucketName: 'images'})
    const downloadStream = bucket.openDownloadStream(id)
    
    downloadStream.on('data',  (data) => res.status(200).write(data))
    downloadStream.on('error', (err)  => res.sendStatus(404))
    downloadStream.on('end',   ()     => res.end())
  
  } catch (err) {
    console.error(req.method, req.originalUrl, err)
    res.sendStatus(500)
  }
})

imageRouter.post('/', checkJwt, jwtAuthz(['write:image'], {customScopeKey: 'permissions'}), uploadMiddleware.single('file'), async function(req, res) {
  try {
    const file: any = req.file

    if (!file)
      return res.status(406).send('Missing file')

    return res.status(201).send(file.id.toString())
  
  } catch (err) {
    console.error(req.method, req.originalUrl, err)
    res.sendStatus(500)
  }
})

imageRouter.delete('/:id', checkJwt, jwtAuthz(['delete:image'], {customScopeKey: 'permissions'}), async function(req, res) {
  try {
    const id = new ObjectId(req.params.id.split('.')?.[0])
    const bucket = new GridFSBucket(mongoose.connection.db, {bucketName: 'images'})

    await bucket.delete(id)
        
    res.sendStatus(200)

  } catch (err) {
    console.error(req.method, req.originalUrl, err)
    res.sendStatus(500)
  }
})

export default imageRouter