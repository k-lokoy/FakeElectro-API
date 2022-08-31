import { Router } from 'express'

import { getDb } from '../database'
import generateImageDataForResponse from '../utils/generateImageDataForResponse'
import getURLFromRequest from '../utils/getURLFromRequest'

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

      if (product.image)
        data.image = generateImageDataForResponse(
          (await db.collection('images.files').findOne({_id: product.image})),
          getURLFromRequest(req)
        )

      return data
    }))

    res.status(200).send(_products)
  
  } catch (err) {
    console.error(req.method, req.originalUrl, err)
    res.sendStatus(500)
  }
})

export default productsRouter