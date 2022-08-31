import { Router } from 'express'

import getURLFromRequest from '../utils/getURLFromRequest'
import { getDb } from '../database'
import generateImageDataForResponse from '../utils/generateImageDataForResponse'

const categoryRouter = Router()

categoryRouter.get('/:slug', async function(req, res) {
  try {
    const db = await getDb()
    const category = await db.collection('Categories').findOne({slug: req.params.slug})

    if (!category)
      return res.sendStatus(404)

    const products = await db.collection('Products').find({category: category._id}).toArray()
    
    res.status(200).send(await Promise.all(products.map(async product => {
      const data: any = {
        ...product,
        category: {
          slug: category?.slug,
          name: category?.name,
        }
      }

      if (product.image)
        data.image = generateImageDataForResponse(
          (await db.collection('images.files').findOne({_id: product.image})),
          getURLFromRequest(req)
        )

      return data
    })))
  
  } catch (err) {
    console.error(req.method, req.originalUrl, err)
    res.sendStatus(500)
  }
})

export default categoryRouter