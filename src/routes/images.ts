import { Router } from 'express'

import { getDb } from '../database'
import getURLFromRequest from '../utils/getURLFromRequest'

const imagesRouter = Router()

imagesRouter.get('/', async function(req, res) {
  try {
    const db = await getDb()
    const images = await db.collection('images.files').find({}).toArray()
    
    res.status(200).send(images.map(img => {
      const ext = img.contentType.match(/\/(.*)/)?.[1] || 'jpeg'
    
      return {
        _id:        img._id,
        uploadDate: img.uploadDate,
        filename:   img.filename,
        type:       img.contentType,
        url:       `${getURLFromRequest(req)}/image/${img._id}.${ext}`
      }
    }))

  } catch (err) {
    console.error(req.method, req.originalUrl, err)
    res.sendStatus(500)
  }
})

export default imagesRouter