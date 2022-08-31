import supertest from 'supertest'
import express from 'express'

// Types
import { Express } from 'express-serve-static-core'
import { Collection, Db, Document, InsertOneResult } from 'mongodb'

import { getDb } from '../../src/database'
import productsRouter from '../../src/routes/products'

describe('routes/products', function() {
  let db: Db
  let images: Collection<Document>
  let categories: Collection<Document>
  let products: Collection<Document>
  let app: Express
  let insertedImage: InsertOneResult<Document>
  const productIds = []

  beforeAll(async function() {
    db = await getDb()
    images = db.collection('images.files')
    categories = db.collection('Categories')
    products = db.collection('Products')
    app = express()
    
    app.use('/products', productsRouter)

    insertedImage = await images.insertOne({contentType: 'images/png'})

    const { insertedId: insertedCategoryId } = await categories.insertOne({slug: 'foo', name: 'Foo'})
    const { insertedId } = await products.insertOne({
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

    productIds.push(insertedId)
    
    jest.spyOn(console, 'error')
  })

  describe('GET', function() {
    it('Should respond with an array of products', async function() {
      const res: any = await supertest(app).get('/products')
      const imageId = insertedImage.insertedId.toString()

      expect(console.error).not.toHaveBeenCalled()
      expect(res.status).toEqual(200)
      expect(JSON.parse(res.text)).toEqual([
        {
          _id: productIds[0].toString(),
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
      const collectionSpy = jest.spyOn(db, 'collection')
      
      const err = new Error('Error message')
      collectionSpy.mockImplementation(() => { throw err })

      const res = await supertest(app).get('/products')

      expect(console.error).toHaveBeenCalledWith('GET', '/products', err)
      expect(res.status).toEqual(500)
    })
  })
})