import supertest from 'supertest'
import express from 'express'

// Types
import { Collection, Db, Document, InsertOneResult } from 'mongodb'
import { Express } from 'express-serve-static-core'

import { getDb } from '../../src/database'
import categoryRouter from '../../src/routes/category'

describe('routes/category', function() {
  let app: Express
  let db: Db
  let images: Collection<Document>
  let categories: Collection<Document>
  let products: Collection<Document>
  let insertedCategories: InsertOneResult<Document>[]
  let insertedProducts: InsertOneResult<Document>[]
  let insertedImage: InsertOneResult<Document>

  beforeAll(async function() {
    app = express()
    db = await getDb()

    app.use('/category', categoryRouter)

    categories = db.collection('Categories')
    products   = db.collection('Products')
    images     = db.collection('images.files')

    insertedImage = await images.insertOne({contentType: 'image/png'})
    
    insertedCategories = await Promise.all([
      categories.insertOne({slug: 'category-1', name: 'Category 1'}),
      categories.insertOne({slug: 'category-2', name: 'Category 2'}),
      categories.insertOne({slug: 'category-3', name: 'Category 3'}),
    ])

    insertedProducts = [
      await products.insertOne({name: 'Product 1', category: insertedCategories[0].insertedId}),
      await products.insertOne({name: 'Product 2', category: insertedCategories[0].insertedId, image: insertedImage.insertedId}),
      await products.insertOne({name: 'Product 3', category: insertedCategories[1].insertedId}),
    ]

    jest.spyOn(console, 'error')
  })

  it('Should respond with an array of products in the category', async function() {
    const res: any = await supertest(app).get('/category/category-1')

    expect(console.error).not.toHaveBeenCalled()
    expect(res.status).toEqual(200)

    const restult = JSON.parse(res.text)
    restult.sort((a, b) => b.name.localeCompare(a.name))

    const imageId = insertedImage.insertedId.toString()
    expect(JSON.parse(res.text)).toEqual([
      {
        _id: insertedProducts[0].insertedId.toString(),
        name: 'Product 1',
        category: {slug: 'category-1', name: 'Category 1'}
      },
      {
        _id: insertedProducts[1].insertedId.toString(),
        name: 'Product 2',
        category: {slug: 'category-1', name: 'Category 1'},
        image: {
          _id: imageId,
          url: `${res.request.protocol}//${res.req.host}/image/${imageId}.png`
        }
      }
    ])
  })

  it('Should handle the category not having any products', async function() {
    const res = await supertest(app).get('/category/category-3')

    expect(console.error).not.toHaveBeenCalled()
    expect(res.status).toEqual(200)
    expect(JSON.parse(res.text)).toEqual([])
  })

  it('Should respond with a 404 status code if the category does not exist', async function() {
    const res = await supertest(app).get('/category/invalid')
  
    expect(console.error).not.toHaveBeenCalled()
    expect(res.status).toEqual(404)
  })

  it('Should respond with a 500 status code if there was an issue getting data from the database', async function() {
    const collectionSpy = jest.spyOn(db, 'collection')
    
    const err = new Error('Error message')
    collectionSpy.mockImplementation(() => { throw err })

    const res = await supertest(app).get('/category/category-1')

    expect(console.error).toHaveBeenCalledWith('GET', '/category/category-1', err)
    expect(res.status).toEqual(500)
  })

})