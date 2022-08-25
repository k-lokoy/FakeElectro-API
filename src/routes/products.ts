import { Router } from 'express'

import { getDb } from '../database'

const productsRouter = Router()

productsRouter.get('/', async function(req, res) {
  try {
    const db = await getDb()
    const products = await db.collection('Products').find().toArray()
    const categories = db.collection('Categories')
    
    const _products = await Promise.all(products.map(async product => {
      const category = await categories.findOne({_id: product.category})

      const data: any = {
        ...product,
        category: {
          slug: category?.slug || '',
          name: category?.name || ''
        }
      }

      if (data.image) {
        const port: string = process.env.PORT || '8080'
        data.image = `${req.protocol}://${req.hostname}${'8080' !== port ? ':'+port : ''}/img/${product.image}.jpg`
      }

      return data
    }))

    res.status(200).send(_products)
  
  } catch (err) {
    console.error(req.method, req.originalUrl, err)
    res.sendStatus(500)
  }
})

export default productsRouter