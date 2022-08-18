import { Router } from 'express'

import { clientPromise } from '../database'

const productsRouter = Router()

productsRouter.get('/', async function(req, res) {
  try {
    const client = await clientPromise
    const products = await client.db(process.env.MONGODB_DB_NAME).collection('Products').find().toArray()

    res.status(200).send(products.map(product => ({
      ...product,
      image: req.secure
        ? `https://${req.get('host')}/img/${product.image}.jpg`
        : `http://${req.get('host')}/img/${product.image}.jpg`
    })))
  
  } catch (err) {
    console.error(req.method, req.originalUrl, err)
    res.sendStatus(500)
  }
})

export default productsRouter