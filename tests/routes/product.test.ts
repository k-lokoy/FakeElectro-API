import supertest from 'supertest'
import express from 'express'
import bodyParser from 'body-parser'
import { Collection, Db, Document, ObjectId } from 'mongodb'
import * as jwtAuthz from 'express-jwt-authz'

import { getDb } from '../../src/database'
import productRouter from '../../src/routes/product'
import { Express } from 'express-serve-static-core'

import checkJwt from '../../src/middleware/checkJwt'

jest.mock('../../src/middleware/checkJwt', () => jest.fn())

jest.mock('express-jwt-authz', () => {
  const jwtAuthzHandler = jest.fn()
  return {
    __esModule: true,
    jwtAuthzHandler,
    default: () => jwtAuthzHandler
  }
})

const checkJwlMocked = jest.mocked(checkJwt)
const jwtAuthzMocked: any = jest.mocked(jwtAuthz)

describe('routes/product', function() {
  let app: Express
  let db: Db
  let categories: Collection<Document>
  let products: Collection<Document>
  const productIds = []
  const imageId = new ObjectId()
  
  beforeAll(async function() {
    db = await getDb()
    app = express()
    app.use(bodyParser.json())
    app.use(bodyParser.urlencoded({extended: true}))
    categories = db.collection('Categories')
    products = db.collection('Products')
    
    app.use('/product', productRouter)

    const { insertedId: categoryId1 } = await categories.insertOne({slug: 'foo', name: 'Foo'})
    const { insertedId: categoryId2 } = await categories.insertOne({slug: 'bar', name: 'Bar'})
    const { insertedId: productId1 } = await products.insertOne({
      name: 'The first product',
      category: categoryId1,
      description: 'Description about the first product.',
      price: 55.5,
      in_stock: 12,
      image: imageId,
      rating: {
        rate: 5,
        count: 99
      },
    })
    const { insertedId: productId2 } = await products.insertOne({
      name: 'The second product',
      category: categoryId2,
      description: 'Description about the second product.',
      price: 100,
      in_stock: 0,
      rating: {
        rate: 3,
        count: 4
      },
    })

    productIds.push(productId1)
    productIds.push(productId2)
    
    jest.spyOn(console, 'error')
  })

  beforeEach(function() {
    checkJwlMocked.mockImplementation((req, res, next) => next())
    jwtAuthzMocked.jwtAuthzHandler.mockImplementation((req, res, next) => next())
  })

  describe('GET', function() {
    it('Should respond with a product', async function() {
      const res: any  = await supertest(app).get(`/product/${productIds[0].toString()}`)

      expect(console.error).not.toHaveBeenCalled()
      expect(res.status).toEqual(200)
      expect(JSON.parse(res.text)).toEqual({
        _id: productIds[0].toString(),
        name: 'The first product',
        category: {
          slug: 'foo',
          name: 'Foo'
        },
        description: 'Description about the first product.',
        price: 55.5,
        in_stock: 12,
        image: `${res.request.protocol}//${res.req.host}/img/${imageId.toString()}.jpg`,
        rating: {
          rate: 5,
          count: 99
        },
      })
    })

    it('Should respond with a 500 status code if there was an issue getting data from the database', async function() {
      const collectionSpy = jest.spyOn(db, 'collection')
      
      const err = new Error('Error message')
      collectionSpy.mockImplementation(() => { throw err })

      const uri = `/product/${productIds[0].toString()}`
      const res: any  = await supertest(app).get(uri)

      expect(console.error).toHaveBeenCalledWith('GET', uri, err)
      expect(res.status).toEqual(500)

      collectionSpy.mockRestore()
    })
  })

  describe('POST', function() {
    let imageId: ObjectId
    let body: any

    beforeAll(function() {
      imageId = new ObjectId()
      body = {
        foo: 'bar',
        category: 'foo',
        image: imageId
      }
    })

    it('Should add a product to the database', async function() {
      const res =
        await supertest(app)
          .post('/product')
          .send(body)
          .set('Content-Type', 'application/json')
      
      const table = await products.find().toArray()
      const target = table[table.length - 1]

      expect(console.error).not.toHaveBeenCalled()
      
      expect(target).toEqual({
        _id: expect.anything(),
        category: (await categories.find().toArray())[0]._id,
        image: imageId,
        foo: 'bar'
      })

      expect(res.status).toEqual(201)
      expect(res.text).toEqual(target._id.toString())
    })

    it('Should respond with a 406 status code if the category is invalid', async function() {
      body.category = 'invalid'

      const res =
        await supertest(app)
          .post('/product')
          .send(body)
          .set('Content-Type', 'application/json')

      const table = await products.find().toArray()

      expect(table.length).toEqual(3)
      expect(res.status).toEqual(406)
      expect(res.text).toEqual('Invalid category')
    })

    it('should respond with a 401 status code if the token is invalid', async function() {
      checkJwlMocked.mockImplementation((req, res, next) => res.sendStatus(401))
      
      const res =
        await supertest(app)
          .post('/product')
          .send(body)
          .set('Content-Type', 'application/json')
    
      expect(res.status).toEqual(401)
    })

    it('should respond with a 401 status code if the token does not relate to an authorized role', async function() {
      jwtAuthzMocked.jwtAuthzHandler.mockImplementation((req, res, next) => res.sendStatus(401))
      
      const res =
        await supertest(app)
          .post('/product')
          .send(body)
          .set('Content-Type', 'application/json')
    
      expect(res.status).toEqual(401)
    })

    it('Should respond with a 500 status code if there was an issue writing to the database', async function() {
      const collectionSpy = jest.spyOn(db, 'collection')
      const err = new Error('Error message')
      
      collectionSpy.mockImplementation(() => { throw err })

      const res =
        await supertest(app)
          .post('/product')
          .send(body)
          .set('Content-Type', 'application/json')

      expect(console.error).toHaveBeenCalledWith('POST', '/product', err)
      expect(res.status).toEqual(500)

      collectionSpy.mockRestore()
    })
  })

  describe('PUT', function() {
    let body: any
    let cats: any[]
    let cat: any
    
    beforeAll(async function() {
      cats = await categories.find().toArray()
      cat  = cats[cats.length - 1]

      body = {
        bar: 'qux',
        category: cat.slug
      }
    })
    
    it('should replace a database entry', async function() {
      const table = await products.find().toArray()
      const target = table[0]

      const res =
        await supertest(app)
          .put(`/product/${target._id.toString()}`)
          .send(body)
          .set('Content-Type', 'application/json')

      expect(console.error).not.toHaveBeenCalled()
      expect(res.status).toEqual(200)

      expect(await products.findOne({_id: target._id})).toEqual({
        _id: expect.anything(),
        bar: 'qux',
        category: cat._id
      })
    })

    it('Should respond with a 404 status code if the entry does not exist', async function() {
      const randomId = new ObjectId()

      const res =
        await supertest(app)
          .put(`/product/${randomId.toString()}`)
          .send(body)
          .set('Content-Type', 'application/json')

      expect(console.error).not.toHaveBeenCalled()
      expect(res.status).toEqual(404)
    })

    it('Should respond with a 406 status code if the category is invalid', async function() {
      const table = await products.find().toArray()
      const target = table[0]
      body.category = 'invalid'

      const res =
        await supertest(app)
          .put(`/product/${target._id.toString()}`)
          .send(body)
          .set('Content-Type', 'application/json')

      expect(console.error).not.toHaveBeenCalled()
      expect(res.status).toEqual(406)
      expect(res.text).toEqual('Invalid category')
    })

    it('Should respond with a 401 status code if the token is invalid', async function() {
      const table = await products.find().toArray()
      const target = table[0]
    
      checkJwlMocked.mockImplementation((req, res, next) => res.sendStatus(401))

      const res =
        await supertest(app)
          .put(`/product/${target._id.toString()}`)
          .send(body)
          .set('Content-Type', 'application/json')
      
      expect(res.status).toEqual(401)
    })

    it('should respond with a 401 status code if the token does not relate to an authorized role', async function() {
      const table = await products.find().toArray()
      const target = table[0]

      jwtAuthzMocked.jwtAuthzHandler.mockImplementation((req, res, next) => res.sendStatus(401))
      
      const res =
        await supertest(app)
          .put(`/product/${target._id.toString()}`)
          .send(body)
          .set('Content-Type', 'application/json')
    
      expect(res.status).toEqual(401)
    })

    it('Should respond with a 500 status code if there was an issue writing to the database', async function() {
      const table = await products.find().toArray()
      const target = table[0]
      const collectionSpy = jest.spyOn(db, 'collection')
      const err = new Error('Error message')
      const uri = `/product/${target._id.toString()}`
      
      collectionSpy.mockImplementation(() => { throw err })

      const res =
        await supertest(app)
          .put(uri)
          .send(body)
          .set('Content-Type', 'application/json')

      expect(console.error).toHaveBeenCalledWith('PUT', uri, err)
      expect(res.status).toEqual(500)

      collectionSpy.mockRestore()
    })
  })
  
  describe('PATCH', function() {
    let body: any
    
    beforeEach(async function() {
      body = {
        baz: 'quux'
      }
    })

    it('Should add and replace data to an entry', async function() {
      const table = await products.find().toArray()
      const target = table[0]
      const category = await categories.findOne({slug: 'foo'})
      const imageId = new ObjectId()

      body.category = 'foo'
      body.image    = imageId.toString()

      const res =
        await supertest(app)
          .patch(`/product/${target._id.toString()}`)
          .send(body)
          .set('Content-Type', 'application/json')

      expect(console.error).not.toBeCalled()
      expect(res.status).toEqual(200)
      
      expect(await products.findOne({_id: target._id})).toEqual({
        _id: target._id,
        category: category._id,
        bar: 'qux',
        baz: 'quux',
        image: imageId
      })
    })

    it('Should respond with a 404 status code if the entry does not exist', async function() {
      const randomId = new ObjectId()

      const res =
        await supertest(app)
          .patch(`/product/${randomId.toString()}`)
          .send(body)
          .set('Content-Type', 'application/json')

      expect(console.error).not.toHaveBeenCalled()
      expect(res.status).toEqual(404)
    })

    it('Should respond with a 406 status code if the category is invalid', async function() {
      const table = await products.find().toArray()
      const target = table[0]
      body.category = 'invalid'

      const res =
        await supertest(app)
          .patch(`/product/${target._id.toString()}`)
          .send(body)
          .set('Content-Type', 'application/json')

      expect(console.error).not.toHaveBeenCalled()
      expect(res.status).toEqual(406)
      expect(res.text).toEqual('Invalid category')
    })

    it('Should respond with a 401 status code if the token is invalid', async function() {
      const table = await products.find().toArray()
      const target = table[0]
    
      checkJwlMocked.mockImplementation((req, res, next) => res.sendStatus(401))

      const res =
        await supertest(app)
          .patch(`/product/${target._id.toString()}`)
          .send(body)
          .set('Content-Type', 'application/json')
      
      expect(res.status).toEqual(401)
    })

    it('should respond with a 401 status code if the token does not relate to an authorized role', async function() {
      const table = await products.find().toArray()
      const target = table[0]

      jwtAuthzMocked.jwtAuthzHandler.mockImplementation((req, res, next) => res.sendStatus(401))
      
      const res =
        await supertest(app)
          .patch(`/product/${target._id.toString()}`)
          .send(body)
          .set('Content-Type', 'application/json')
    
      expect(res.status).toEqual(401)
    })

    it('Should respond with a 500 status code if there was an issue writing to the database', async function() {
      const table = await products.find().toArray()
      const target = table[0]
      const collectionSpy = jest.spyOn(db, 'collection')
      const err = new Error('Error message')
      const uri = `/product/${target._id.toString()}`
      
      collectionSpy.mockImplementation(() => { throw err })

      const res =
        await supertest(app)
          .patch(uri)
          .send(body)
          .set('Content-Type', 'application/json')

      expect(console.error).toHaveBeenCalledWith('PATCH', uri, err)
      expect(res.status).toEqual(500)

      collectionSpy.mockRestore()
    })
  })

  describe('DELETE', function() {
    let expectedProducts: any[]

    beforeAll(async function() {
      expectedProducts = [
        {
          _id: expect.anything(),
          category: (await categories.findOne({slug: 'bar'}))._id,
          description: 'Description about the second product.',
          in_stock: 0,
          name: 'The second product',
          price: 100,
          rating: {
            count: 4,
            rate: 3,
          },
        },
        {
          _id: expect.anything(),
          category: (await categories.findOne({slug: 'foo'}))._id,
          foo: 'bar',
          image: expect.anything(),
        }
      ]
    })
    
    it('Should delete an entry', async function() {
      const table = await products.find().toArray()
      const target = table[0]
      
      const res = await supertest(app).delete(`/product/${target._id.toString()}`)

      expect(console.error).not.toBeCalled()
      expect(res.status).toEqual(200)
      expect(await products.find().toArray()).toEqual(expectedProducts)
    })

    it('Should respond with a 404 status code if the entry does not exist', async function() {
      const randomId = new ObjectId()

      const res = await supertest(app).delete(`/product/${randomId.toString()}`)
          
      expect(console.error).not.toHaveBeenCalled()
      expect(res.status).toEqual(404)
    })
    
    it('Should respond with a 401 status code if the token is invalid', async function() {
      const table = await products.find().toArray()
      const target = table[0]
    
      checkJwlMocked.mockImplementation((req, res, next) => res.sendStatus(401))

      const res = await supertest(app).delete(`/product/${target._id.toString()}`)
      
      expect(res.status).toEqual(401)
    })

    it('should respond with a 401 status code if the token does not relate to an authorized role', async function() {
      const table = await products.find().toArray()
      const target = table[0]

      jwtAuthzMocked.jwtAuthzHandler.mockImplementation((req, res, next) => res.sendStatus(401))
      
      const res = await supertest(app).delete(`/product/${target._id.toString()}`)
      
      expect(res.status).toEqual(401)
    })

    it('Should respond with a 500 status code if there was an issue writing to the database', async function() {
      const table = await products.find().toArray()
      const target = table[0]
      const collectionSpy = jest.spyOn(db, 'collection')
      const err = new Error('Error message')
      const uri = `/product/${target._id.toString()}`
      
      collectionSpy.mockImplementation(() => { throw err })

      const res = await supertest(app).delete(uri)
    
      expect(console.error).toHaveBeenCalledWith('DELETE', uri, err)
      expect(res.status).toEqual(500)

      collectionSpy.mockRestore()
    })
  })
})