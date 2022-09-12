import { Router } from 'express'
import { ObjectId } from 'mongodb'
import mongoose from 'mongoose'
import jwtAuthz from 'express-jwt-authz'

import { Category, Product } from '../database'
import checkJwt from '../middleware/checkJwt'
import getURLFromRequest from '../utils/getURLFromRequest'
import generateImageDataForResponse from '../utils/generateImageDataForResponse'

const productRouter = Router()

productRouter.get('/:id', async function(req, res) {
  try {
    const _id = new ObjectId(req.params.id)
    const { __v, ...product } = await Product.findOne({_id}).lean()

    if (!product) return res.sendStatus(404)

    const category = await Category.findOne({_id: product.category})

    const data: any = {
      ...product,
      category: {
        slug: category?.slug || '',
        name: category?.name || ''
      }
    }

    delete data.rating._id

    if (product.image)
      data.image = await generateImageDataForResponse(product.image, getURLFromRequest(req))

    res.status(200).send(data)
  
  } catch (err) {
    console.error(req.method, req.originalUrl, err)
    res.sendStatus(500)
  }
})

productRouter.post(
  '/',
  checkJwt, 
  jwtAuthz(['write:product'], {customScopeKey: 'permissions'}), 
  async function(req, res) {
    try {
      const category = await Category.findOne({slug: req.body.category})

      if (!category)
        return res.status(406).send('Invalid category')

      const data = {
        ...req.body,
        category: category._id,
      }

      if (data.image)
        data.image = new ObjectId(data.image)

      const product = new Product(data)
      const validationErr = product.validateSync()

      if (validationErr) {
        const { name, message } = Object.values(validationErr.errors)[0]
        return res.status(406).send(`${name}: ${message}`)
      }

      const { _id } = await product.save()
      
      res.status(201).send(_id.toString())
      
    } catch (err) {
      console.error(req.method, req.originalUrl, err)
      res.sendStatus(500)
    }
  }
)

productRouter.put(
  '/:id',
  checkJwt,
  jwtAuthz(['write:product'], {customScopeKey: 'permissions'}),
  async function(req, res) {
    try {
      const _id = new ObjectId(req.params.id)
    
      const existingEntry = await Product.findOne({_id})
      if (!existingEntry)
        return res.sendStatus(404)

      const category = await Category.findOne({slug: req.body.category})
      if (!category)
        return res.status(406).send('Invalid category')

      const data = {
        ...req.body,
        category: category._id,
      }
      
      const newProduct = new Product(data)
      const validationErr = newProduct.validateSync()

      if (validationErr) {
        const { name, message } = Object.values(validationErr.errors)[0]
        return res.status(406).send(`${name}: ${message}`)
      }

      await Product.findOneAndReplace({_id}, data)
      
      res.sendStatus(200)

    } catch (err) {
      console.error(req.method, req.originalUrl, err)
      res.sendStatus(500)
    }
  }
)

productRouter.patch(
  '/:id',
  checkJwt,
  jwtAuthz(['write:product'], {customScopeKey: 'permissions'}),
  async function(req, res) {
    try {
      const _id = new ObjectId(req.params.id)
      
      const product = await Product.findOne({_id}).lean()
      if (!product)
        return res.sendStatus(404)
      
      const data = {...req.body}

      if (data.category) {
        const category = await Category.findOne({slug: data.category})
      
        if (!category)
          return res.status(406).send('Invalid category')

        data.category = category._id
      }

      if (data.image)
        data.image = new ObjectId(data.image)

      const newProduct = new Product({...product, ...data})
      const validationErr = newProduct.validateSync()

      if (validationErr) {
        const { name, message } = Object.values(validationErr.errors)[0]
        return res.status(400).send(`${name}: ${message}`)
      }

      await Product.findOneAndUpdate({_id: product._id}, data)
      
      res.sendStatus(200)

    } catch (err) {
      console.error(req.method, req.originalUrl, err)
      res.sendStatus(500)
    }
  }
)

productRouter.delete(
  '/:id',
  checkJwt,
  jwtAuthz(['delete:product'], {customScopeKey: 'permissions'}),
  async function(req, res) {
    try {
      const _id = new ObjectId(req.params.id)
      const existingEntry = await Product.findOne({_id})
      
      if (!existingEntry)
        return res.sendStatus(404)
      
      await Product.deleteOne({_id})
      
      res.sendStatus(200)
      
    } catch (err) {
      console.error(req.method, req.originalUrl, err)
      res.sendStatus(500)
    }
  }
)

export default productRouter