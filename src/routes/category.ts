import { Router } from 'express'

import { getDb } from '../database'

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

      if (data.image) {
        const port: string = process.env.PORT || '8080'
        data.image = {
          _id: product.image,
          url: `${req.protocol}://${req.hostname}${'8080' !== port ? ':'+port : ''}/image/${product.image}.jpg`
        }
      }

      return data
    })))
  
  } catch (err) {
    console.error(req.method, req.originalUrl, err)
    res.sendStatus(500)
  }
})

export default categoryRouter