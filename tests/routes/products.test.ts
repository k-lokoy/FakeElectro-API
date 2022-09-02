import supertest from 'supertest'
import express from 'express'
import mongoose from 'mongoose'
import { MongoMemoryServer } from 'mongodb-memory-server'
import { Express } from 'express-serve-static-core'

import { Category, Product } from '../../src/database'
import productsRouter from '../../src/routes/products'

describe('routes/products', function() {
  let app: Express
  let insertedImage: any
  
  beforeAll(async function() {
    const mongoServer = await MongoMemoryServer.create()
    app = express()

    await mongoose.connect(mongoServer.getUri())

    insertedImage = await mongoose.connection.collection('images.files').insertOne({contentType: 'images/png'})

    const { insertedId: insertedCategoryId } = await Category.collection.insertOne({slug: 'foo', name: 'Foo'})
    
    await Product.collection.insertOne({
      name: 'the product',
      category: insertedCategoryId,
      description: 'Description about the product.',
      price: 55.5,
      in_stock: 12,
      image: insertedImage.insertedId,
      rating: {
        rate: 5,
        count: 99
      },
    })

    app.use('/products', productsRouter)
    
    jest.spyOn(console, 'error')
  })

  afterAll(async () => {
    await mongoose.disconnect()
    await mongoose.connection.close()
  })

  describe('GET', function() {
    it('Should respond with an array of products', async function() {
      const res: any = await supertest(app).get('/products')
      const imageId = insertedImage.insertedId.toString()

      expect(console.error).not.toHaveBeenCalled()
      expect(res.status).toEqual(200)
      expect(JSON.parse(res.text)).toEqual([
        {
          _id: expect.anything(),
          name: 'the product',
          category: {
            slug: 'foo',
            name: 'Foo'
          },
          description: 'Description about the product.',
          price: 55.5,
          in_stock: 12,
          image: {
            _id: imageId,
            url: `${res.request.protocol}//${res.req.host}/image/${imageId}.png`,
          },
          rating: {
            rate: 5,
            count: 99
          },
        }
      ])
    })

    it('Should respond with a 500 status code if there was an issue getting data from the database', async function() {
      const findSpy = jest.spyOn(Product, 'find')
      
      const err = new Error('Error message')
      findSpy.mockImplementation(() => { throw err })

      const res = await supertest(app).get('/products')

      expect(console.error).toHaveBeenCalledWith('GET', '/products', err)
      expect(res.status).toEqual(500)
    })
  })
})