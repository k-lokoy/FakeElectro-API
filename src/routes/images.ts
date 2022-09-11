import { Router } from 'express'
import mongoose from 'mongoose'

import generateImageDataForResponse from '../utils/generateImageDataForResponse'
import getURLFromRequest from '../utils/getURLFromRequest'

const imagesRouter = Router()

imagesRouter.get('/', async function(req, res) {
  try {
    const images = await mongoose.connection.collection('images.files').find().toArray()
    
    res.status(200).send(await Promise.all(images.map(async img => {
      const { url } = await generateImageDataForResponse(img._id, getURLFromRequest(req))
    
      return {
        _id:        img._id,
        uploadDate: img.uploadDate,
        filename:   img.filename,
        type:       img.contentType,
        url
      }
    })))

  } catch (err) {
    console.error(req.method, req.originalUrl, err)
    res.sendStatus(500)
  }
})

export default imagesRouter