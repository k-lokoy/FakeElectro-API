import { Router } from 'express'
import { ObjectId } from 'mongodb'
import multer from 'multer'

import { clientPromise } from '../database'
import uploadMiddleware from '../middleware/upload'

const productRouter = Router()

productRouter.get('/:id', async function(req, res) {
  try {
    const _id = new ObjectId(req.params.id)
    const client = await clientPromise
    const product = await client.db(process.env.MONGODB_DB_NAME).collection('Products').findOne({_id})

    if (!product) return res.sendStatus(404)

    res.status(200).send(product)
  
  } catch (err) {
    console.error(req.method, req.originalUrl, err)
    res.sendStatus(500)
  }
})

productRouter.post('/', async function(req, res) {
  try {
    const client = await clientPromise
    const collection = await client.db(process.env.MONGODB_DB_NAME).collection('Products')

    const data = await collection.insertOne(req.body)
  
    res.status(201).send(await collection.findOne({_id: data.insertedId}))
  
  } catch (err) {
    console.error(req.method, req.originalUrl, err)
    res.sendStatus(500)
  }

})

productRouter.put('/:id', uploadMiddleware.single('file'), async function(req, res) {
  try {
    const id = new ObjectId(req.params.id)
    const client = await clientPromise
    const collection = await client.db(process.env.MONGODB_DB_NAME).collection('Products')

    const file: any = req.file
    const data = {...req.body}
    if (file) data.image = file.id

    await collection.findOneAndUpdate({_id: id}, {$set: data})
    
    res.status(200).send(await collection.findOne({_id: id}))

  } catch (err) {
    console.error(req.method, req.originalUrl, JSON.stringify(err, null, 3))
    res.sendStatus(500)
  }
})

productRouter.delete('/:id', async function(req, res) {
  try {
    const id = new ObjectId(req.params.id)
    const client = await clientPromise
    const collection = await client.db(process.env.MONGODB_DB_NAME).collection('Products')
    
    await collection.deleteOne({_id: id})
    
    res.sendStatus(204)
    
  } catch (err) {
    console.error(req.method, req.originalUrl, err)
    res.sendStatus(500)
  }
})

export default productRouter