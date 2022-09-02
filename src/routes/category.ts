import { Router } from 'express'
import mongoose from 'mongoose'

import getURLFromRequest from '../utils/getURLFromRequest'
import { Product, Category } from '../database'
import generateImageDataForResponse from '../utils/generateImageDataForResponse'

const categoryRouter = Router()

categoryRouter.get('/:slug', async function(req, res) {
  try {
    const category = await Category.findOne({slug: req.params.slug}).lean()
    
    if (!category)
      return res.sendStatus(404)

    const products = await Product.find({category: category._id}).lean()
    
    res.status(200).send(await Promise.all(products.map(async ({ __v, ...product }) => {
      const data: any = {
        ...product,
        category: {
          slug: category?.slug,
          name: category?.name,
        }
      }
      
      if (product.image)
        data.image = generateImageDataForResponse(
          (await mongoose.connection.collection('images.files').findOne({_id: product.image})),
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