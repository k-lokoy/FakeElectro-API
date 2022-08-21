import { Router } from 'express'
import { ObjectId } from 'mongodb'
import jwtAuthz from 'express-jwt-authz'

import { clientPromise } from '../database'
import checkJwt from '../middleware/checkJwt'

const productRouter = Router()

productRouter.get('/:id', async function(req, res) {
  try {
    const _id = new ObjectId(req.params.id)
    const client = await clientPromise
    const db = client.db(process.env.MONGODB_DB_NAME) 
    const product = await db.collection('Products').findOne({_id})

    if (!product) return res.sendStatus(404)

    const categories = await db.collection('Categories')
    const category = await categories.findOne({_id: product.category})

    const data: any = {
      ...product,
      category: {
        slug: category?.slug || '',
        name: category?.name || ''
      }
    }

    if (product.image)
      data.image =
        `http${req.secure ? 's' : ''}://${req.get('host')}/img/${product.image}.jpg`

    res.status(200).send(data)
  
  } catch (err) {
    console.error(req.method, req.originalUrl, err)
    res.sendStatus(500)
  }
})

productRouter.post('/', checkJwt, jwtAuthz(['write:product'], {customScopeKey: 'permissions'}), async function(req, res) {
  try {
    const client = await clientPromise
    const db = await client.db(process.env.MONGODB_DB_NAME)
    const products = await db.collection('Products')
    const categories = await db.collection('Categories')

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
  
    res.status(201).send(insertedId)
  
  } catch (err) {
    console.error(req.method, req.originalUrl, err)
    res.sendStatus(500)
  }

})

productRouter.put('/:id', checkJwt, jwtAuthz(['write:product'], {customScopeKey: 'permissions'}), async function(req, res) {
  try {
    const _id = new ObjectId(req.params.id)
    const client = await clientPromise
    const db = await client.db(process.env.MONGODB_DB_NAME)
    const products = await db.collection('Products')

    const categories = await db.collection('Categories')
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
    const _id = new ObjectId(req.params.id)
    const client = await clientPromise
    const db = await client.db(process.env.MONGODB_DB_NAME)
    const products = await db.collection('Products')
    
    const data = {...req.body}

    if (data.category) {
      const categories = await db.collection('Categories')
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
    const _id = new ObjectId(req.params.id)
    const client = await clientPromise
    const collection = await client.db(process.env.MONGODB_DB_NAME).collection('Products')
    
    await collection.deleteOne({_id})
    
    res.sendStatus(200)
    
  } catch (err) {
    console.error(req.method, req.originalUrl, err)
    res.sendStatus(500)
  }
})

export default productRouter