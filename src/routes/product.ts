import { Router } from 'express'
import { ObjectId } from 'mongodb'
import jwtAuthz from 'express-jwt-authz'

import { getDb } from '../database'
import checkJwt from '../middleware/checkJwt'
import getURLFromRequest from '../utils/getURLFromRequest'

const productRouter = Router()

productRouter.get('/:id', async function(req, res) {
  try {
    const db = await getDb()
    const _id = new ObjectId(req.params.id)
    const product = await db.collection('Products').findOne({_id})

    if (!product) return res.sendStatus(404)

    const categories = db.collection('Categories')
    const category = await categories.findOne({_id: product.category})

    const data: any = {
      ...product,
      category: {
        slug: category?.slug || '',
        name: category?.name || ''
      }
    }

    if (product.image) {
      const image = await db.collection('images.files').findOne({_id: product.image})
      const ext = image.contentType.match(/\/(.*)/)?.[1] || 'jpg'

      data.image = {
        _id: image._id,
        url: `${getURLFromRequest(req)}/image/${image._id}.${ext}`
      }
    }

    res.status(200).send(data)
  
  } catch (err) {
    console.error(req.method, req.originalUrl, err)
    res.sendStatus(500)
  }
})

productRouter.post('/', checkJwt, jwtAuthz(['write:product'], {customScopeKey: 'permissions'}), async function(req, res) {
  try {
    const db = await getDb()
    const products = db.collection('Products')
    const categories = db.collection('Categories')

    const category = await categories.findOne({slug: req.body.category})

    if (!category)
      return res.status(406).send('Invalid category')

    const data  = {
      ...req.body,
      category: category._id
    }

    if (data.image)
      data.image = new ObjectId(data.image)

    const { insertedId } = await products.insertOne(data)
  
    res.status(201).send(insertedId.toString())
  
  } catch (err) {
    console.error(req.method, req.originalUrl, err)
    res.sendStatus(500)
  }
})

productRouter.put('/:id', checkJwt, jwtAuthz(['write:product'], {customScopeKey: 'permissions'}), async function(req, res) {
  try {
    const db = await getDb()
    const _id = new ObjectId(req.params.id)
    const products = db.collection('Products')
    const categories = db.collection('Categories')
    
    const existingEntry = await products.findOne({_id})
    if (!existingEntry)
      return res.sendStatus(404)

    const category = await categories.findOne({slug: req.body.category})
    if (!category)
      return res.status(406).send('Invalid category')

    const data = {
      ...req.body,
      category: category._id
    }
    
    await products.findOneAndReplace({_id}, data)
    
    res.sendStatus(200)

  } catch (err) {
    console.error(req.method, req.originalUrl, err)
    res.sendStatus(500)
  }
})

productRouter.patch('/:id', checkJwt, jwtAuthz(['write:product'], {customScopeKey: 'permissions'}), async function(req, res) {
  try {
    const db = await getDb()
    const _id = new ObjectId(req.params.id)
    const products = db.collection('Products')

    const existingEntry = await products.findOne({_id})
    if (!existingEntry)
      return res.sendStatus(404)
    
    const data = {...req.body}

    if (data.category) {
      const categories = db.collection('Categories')
      const category = await categories.findOne({slug: data.category})
    
      if (!category)
        return res.status(406).send('Invalid category')

      data.category = category._id
    }

    if (data.image)
      data.image = new ObjectId(data.image)

    await products.findOneAndUpdate({_id}, {$set: data})
    
    res.sendStatus(200)

  } catch (err) {
    console.error(req.method, req.originalUrl, err)
    res.sendStatus(500)
  }
})

productRouter.delete('/:id', checkJwt, jwtAuthz(['delete:product'], {customScopeKey: 'permissions'}), async function(req, res) {
  try {
    const db = await getDb()
    const _id = new ObjectId(req.params.id)
    const collection = db.collection('Products')

    const existingEntry = await collection.findOne({_id})
    if (!existingEntry)
      return res.sendStatus(404)
    
    await collection.deleteOne({_id})
    
    res.sendStatus(200)
    
  } catch (err) {
    console.error(req.method, req.originalUrl, err)
    res.sendStatus(500)
  }
})

export default productRouter