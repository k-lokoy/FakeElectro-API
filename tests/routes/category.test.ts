import supertest from 'supertest'
import express from 'express'
import { InsertOneResult } from 'mongodb'
import mongoose from 'mongoose'
import { MongoMemoryServer } from 'mongodb-memory-server'
import { Express } from 'express-serve-static-core'

import { Category, Product } from '../../src/database'
import categoryRouter from '../../src/routes/category'

describe('routes/category', function() {
  let app: Express
  let insertedProducts: Product[]
  let insertedCategories: Category[]
  let insertedImage: InsertOneResult<mongoose.AnyObject>

  beforeAll(async function() {
    const mongoServer = await MongoMemoryServer.create()
    app = express()

    await mongoose.connect(mongoServer.getUri())
    
    app.use('/category', categoryRouter)

    insertedCategories = await Category.insertMany([
      {slug: 'category-1', name: 'Category 1'},
      {slug: 'category-2', name: 'Category 2'},
      {slug: 'category-3', name: 'Category 3'},
    ])

    insertedImage = await mongoose.connection.collection('images.files').insertOne({contentType: 'image/png'})

    insertedProducts = await Product.insertMany([
      {
        name: 'Product 1',
        category: insertedCategories[0]._id,
        price: 100,
        in_stock: 101,
        rating: {
          rate: 10,
          count: 1
        }
      },
      {
        name: 'Product 2',
        category: insertedCategories[0]._id,
        image: insertedImage.insertedId,
        price: 200,
        in_stock: 201,
        rating: {
          rate: 20,
          count: 2
        }
      },
      {
        name: 'Product 3',
        category: insertedCategories[1]._id,
        price: 300,
        in_stock: 301,
        rating: {
          rate: 30,
          count: 3
        }
      },
    ])

    jest.spyOn(console, 'error')
  })

  it('Should respond with an array of products in the category', async function() {
    const res: any = await supertest(app).get('/category/category-1')

    expect(console.error).not.toHaveBeenCalled()
    expect(res.status).toEqual(200)
    
    const imageId = insertedImage.insertedId.toString()
    expect(JSON.parse(res.text)).toEqual([
      {
        _id: insertedProducts[0]._id.toString(),
        name: 'Product 1',
        description: '',
        category: {
          slug: 'category-1',
          name: 'Category 1'
        },
        price: 100,
        in_stock: 101,
        rating: {
          rate: 10,
          count: 1
        }
      },
      {
        _id: insertedProducts[1]._id.toString(),
        name: 'Product 2',
        description: '',
        category: {
          slug: 'category-1',
          name: 'Category 1'
        },
        image: {
          _id: imageId,
          url: `${res.request.protocol}//${res.req.host}/image/${imageId}.png`
        },
        price: 200,
        in_stock: 201,
        rating: {
          rate: 20,
          count: 2
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
    const findSpy = jest.spyOn(Product, 'find')
    
    const err = new Error('Error message')
    findSpy.mockImplementation(() => { throw err })

    const res = await supertest(app).get('/category/category-1')

    expect(console.error).toHaveBeenCalledWith('GET', '/category/category-1', err)
    expect(res.status).toEqual(500)
  })
})