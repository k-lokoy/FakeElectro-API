import { Router } from 'express'

import { clientPromise } from '../database'

const productsRouter = Router()

productsRouter.get('/', async function(req, res) {
  try {
    const client = await clientPromise
    const db = client.db(process.env.MONGODB_DB_NAME) 
    const products = await db.collection('Products').find().toArray()
    const categories = await db.collection('Categories')

    res.status(200).send(await Promise.all(products.map(async product => {
      const category = await categories.findOne({_id: product.category})
      
      return {
        ...product,
        category: {
          slug: category?.slug || '',
          name: category?.name || ''
        },
        image: req.secure
          ? `https://${req.get('host')}/img/${product.image}.jpg`
          : `http://${req.get('host')}/img/${product.image}.jpg`
      }
    })))
  
  } catch (err) {
    console.error(req.method, req.originalUrl, err)
    res.sendStatus(500)
  }
})

export default productsRouter