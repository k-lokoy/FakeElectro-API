import supertest from 'supertest'
import express from 'express'

// Types
import { Express } from 'express-serve-static-core'
import { Collection, Db, Document, ObjectId } from 'mongodb'

import { getDb } from '../../src/database'
import productsRouter from '../../src/routes/products'

describe('routes/products', function() {
  let db: Db
  let categories: Collection<Document>
  let products: Collection<Document>
  let app: Express
  const productIds = []
  const imageId = new ObjectId()

  beforeAll(async function() {
    db = await getDb()
    categories = db.collection('Categories')
    products = db.collection('Products')
    app = express()
    
    app.use('/products', productsRouter)

    const { insertedId: insertedCategoryId } = await categories.insertOne({slug: 'foo', name: 'Foo'})
    const { insertedId } = await products.insertOne({
      name: 'the product',
      category: insertedCategoryId,
      description: 'Description about the product.',
      price: 55.5,
      in_stock: 12,
      image: imageId,
      rating: {
        rate: 5,
        count: 99
      },
    })

    productIds.push(insertedId)
    
    jest.spyOn(console, 'error')
  })

  describe('GET', function() {
    let res: any
    
    beforeAll(async function() {
      res = await supertest(app).get('/products')
    })

    it('Should respond with an array of products', async function() {
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
          image: `${res.request.protocol}//${res.request.host}/img/${imageId.toString()}.jpg`,
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