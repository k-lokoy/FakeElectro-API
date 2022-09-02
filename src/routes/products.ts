import { Router } from 'express'
import mongoose from 'mongoose'

import { Product, Category } from '../database'
import generateImageDataForResponse from '../utils/generateImageDataForResponse'
import getURLFromRequest from '../utils/getURLFromRequest'

const productsRouter = Router()

productsRouter.get('/', async function(req, res) {
  try {
    const categories = await Category.find()
    
    const products = await Product.find().lean().then(products => Promise.all(products.map(async ({ __v, ...product }) => {  
      const category = categories.find(({ _id }) => _id.toString() === product.category.toString())
      const data: any = {
        ...product,
        category: {
          slug: category?.slug || '',
          name: category?.name || ''
        },
      }

      if (product.image)
        data.image = generateImageDataForResponse(
          (await mongoose.connection.collection('images.files').findOne({_id: product.image})),
          getURLFromRequest(req)
        )

      return data
    })))

    res.status(200).send(products)
  
  } catch (err) {
    console.error(req.method, req.originalUrl, err)
    res.sendStatus(500)
  }
})

export default productsRouter