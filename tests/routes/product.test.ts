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
  let categoriesCollection: Collection<Document>
  let imagesCollection: Collection<Document>
  let productsCollection: Collection<Document>
  
  beforeAll(async function() {
    db = await getDb()
    app = express()

    app.use(bodyParser.json())
    app.use(bodyParser.urlencoded({extended: true}))
    app.use('/product', productRouter)
    
    // Insert categories
    categoriesCollection = db.collection('Categories')
    await Promise.all([
      categoriesCollection.insertOne({slug: 'foo', name: 'Foo'}),
      categoriesCollection.insertOne({slug: 'bar', name: 'Bar'}),
    ])

    // Insert images
    imagesCollection = db.collection('images.files')
    await Promise.all([
      imagesCollection.insertOne({filename: 'foobar.jpg', contentType: 'images/jpeg'}),
      imagesCollection.insertOne({filename: 'foobaz.png', contentType: 'images/png'}),
    ])

    // Insert products
    productsCollection = db.collection('Products')
    await Promise.all([
      productsCollection.insertOne({
        name: 'The first product',
        category: (await categoriesCollection.findOne({slug: 'foo'}))._id,
        description: 'Description about the first product.',
        price: 55.5,
        in_stock: 12,
        image: (await imagesCollection.findOne({filename: 'foobar.jpg'}))._id,
        rating: {
          rate: 5,
          count: 99
        }
      }),
      productsCollection.insertOne({
        name: 'The second product',
        category: (await categoriesCollection.findOne({slug: 'bar'}))._id,
        description: 'Description about the second product.',
        price: 100,
        in_stock: 0,
        rating: {
          rate: 3,
          count: 4
        },
      })
    ])
    
    jest.spyOn(console, 'error')
  })

  beforeEach(function() {
    checkJwlMocked.mockImplementation((req, res, next) => next())
    jwtAuthzMocked.jwtAuthzHandler.mockImplementation((req, res, next) => next())
  })

  describe('GET', function() {
    let target: Document

    beforeAll(async function() {
      target = await productsCollection.findOne({name: 'The first product'})
    })
    
    it('Should respond with a product', async function() {
      const res: any = await supertest(app).get(`/product/${target._id.toString()}`)

      expect(console.error).not.toHaveBeenCalled()
      expect(res.status).toEqual(200)
      expect(JSON.parse(res.text)).toEqual({
        _id: target._id.toString(),
        name: 'The first product',
        category: {
          slug: 'foo',
          name: 'Foo'
        },
        description: 'Description about the first product.',
        price: 55.5,
        in_stock: 12,
        image: `${res.request.protocol}//${res.req.host}/image/${target.image.toString()}.jpeg`,
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

      const uri = `/product/${target._id.toString()}`
      const res: any  = await supertest(app).get(uri)

      expect(console.error).toHaveBeenCalledWith('GET', uri, err)
      expect(res.status).toEqual(500)

      collectionSpy.mockRestore()
    })
  })

  describe('POST', function() {
    let image: Document
    let body: any

    beforeAll(async function() {
      image = await imagesCollection.findOne({filename: 'foobaz.png'})

      body = {
        foo: 'bar',
        category: 'foo',
        image: image._id.toString()
      }
    })

    it('Should add a product to the database', async function() {
      const res: any =
        await supertest(app)
          .post('/product')
          .send(body)
          .set('Content-Type', 'application/json')
  
      const product = await productsCollection.findOne({_id: new ObjectId(res.text)})
      
      expect(console.error).not.toHaveBeenCalled()
      
      expect(product).toEqual({
        _id: new ObjectId(res.text),
        category: (await categoriesCollection.findOne({slug: 'foo'}))._id,
        image: {
          _id: image._id,
          url: `${res.request.protocol}//${res.req.host}/image/${image._id}.jpg`
        },
        foo: 'bar'
      })

      expect(res.status).toEqual(201)
      expect(res.text).toEqual(product._id.toString())
    })

    it('Should respond with a 406 status code if the category is invalid', async function() {
      body.category = 'invalid'

      const res =
        await supertest(app)
          .post('/product')
          .send(body)
          .set('Content-Type', 'application/json')

      const table = await productsCollection.find().toArray()

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
    let target: Document

    beforeEach(async function() {
      target = await productsCollection.findOne({name: 'The first product'})
    })
    
    it('should replace a database entry', async function() {
      const res =
        await supertest(app)
          .put(`/product/${target._id.toString()}`)
          .send({
            name: target.name,
            bar: 'qux',
            category: 'bar'
          })
          .set('Content-Type', 'application/json')

      expect(console.error).not.toHaveBeenCalled()
      expect(res.status).toEqual(200)

      expect(await productsCollection.findOne({_id: target._id})).toEqual({
        _id: target._id,
        name: target.name,
        bar: 'qux',
        category: (await categoriesCollection.findOne({slug: 'bar'}))._id
      })
    })

    it('Should respond with a 404 status code if the entry does not exist', async function() {
      const randomId = new ObjectId()

      const res =
        await supertest(app)
          .put(`/product/${randomId.toString()}`)
          .send({})
          .set('Content-Type', 'application/json')

      expect(console.error).not.toHaveBeenCalled()
      expect(res.status).toEqual(404)
    })

    it('Should respond with a 406 status code if the category is invalid', async function() {
      const res =
        await supertest(app)
          .put(`/product/${target._id.toString()}`)
          .send({category: 'invalid'})
          .set('Content-Type', 'application/json')

      expect(console.error).not.toHaveBeenCalled()
      expect(res.status).toEqual(406)
      expect(res.text).toEqual('Invalid category')
    })

    it('Should respond with a 401 status code if the token is invalid', async function() {
      checkJwlMocked.mockImplementation((req, res, next) => res.sendStatus(401))

      const res =
        await supertest(app)
          .put(`/product/${target._id.toString()}`)
          .send({})
          .set('Content-Type', 'application/json')
      
      expect(res.status).toEqual(401)
    })

    it('should respond with a 401 status code if the token does not relate to an authorized role', async function() {
      jwtAuthzMocked.jwtAuthzHandler.mockImplementation((req, res, next) => res.sendStatus(401))
      
      const res =
        await supertest(app)
          .put(`/product/${target._id.toString()}`)
          .send({})
          .set('Content-Type', 'application/json')
    
      expect(res.status).toEqual(401)
    })

    it('Should respond with a 500 status code if there was an issue writing to the database', async function() {
      const collectionSpy = jest.spyOn(db, 'collection')
      const err = new Error('Error message')
      const uri = `/product/${target._id.toString()}`
      
      collectionSpy.mockImplementation(() => { throw err })

      const res =
        await supertest(app)
          .put(uri)
          .send({})
          .set('Content-Type', 'application/json')

      expect(console.error).toHaveBeenCalledWith('PUT', uri, err)
      expect(res.status).toEqual(500)

      collectionSpy.mockRestore()
    })
  })
  
  describe('PATCH', function() {
    let target: Document

    beforeEach(async function() {
      target = await productsCollection.findOne({name: 'The first product'})
    })

    it('Should add and replace data to an entry', async function() {
      const category = await categoriesCollection.findOne({slug: 'foo'})
      const imageId = new ObjectId()

      const res =
        await supertest(app)
          .patch(`/product/${target._id.toString()}`)
          .send({
            category: 'foo',
            image: imageId.toString(),
            baz: 'quux'
          })
          .set('Content-Type', 'application/json')

      expect(console.error).not.toBeCalled()
      expect(res.status).toEqual(200)
      
      expect(await productsCollection.findOne({_id: target._id})).toEqual({
        _id: target._id,
        name: target.name,
        category: category._id,
        bar: 'qux',
        baz: 'quux',
        image: imageId,
      })
    })

    it('Should respond with a 404 status code if the entry does not exist', async function() {
      const randomId = new ObjectId()

      const res =
        await supertest(app)
          .patch(`/product/${randomId.toString()}`)
          .send({})
          .set('Content-Type', 'application/json')

      expect(console.error).not.toHaveBeenCalled()
      expect(res.status).toEqual(404)
    })

    it('Should respond with a 406 status code if the category is invalid', async function() {
      const res =
        await supertest(app)
          .patch(`/product/${target._id.toString()}`)
          .send({category: 'invalid'})
          .set('Content-Type', 'application/json')

      expect(console.error).not.toHaveBeenCalled()
      expect(res.status).toEqual(406)
      expect(res.text).toEqual('Invalid category')
    })

    it('Should respond with a 401 status code if the token is invalid', async function() {
      checkJwlMocked.mockImplementation((req, res, next) => res.sendStatus(401))

      const res =
        await supertest(app)
          .patch(`/product/${target._id.toString()}`)
          .send({})
          .set('Content-Type', 'application/json')
      
      expect(res.status).toEqual(401)
    })

    it('should respond with a 401 status code if the token does not relate to an authorized role', async function() {
      jwtAuthzMocked.jwtAuthzHandler.mockImplementation((req, res, next) => res.sendStatus(401))
      
      const res =
        await supertest(app)
          .patch(`/product/${target._id.toString()}`)
          .send({})
          .set('Content-Type', 'application/json')
    
      expect(res.status).toEqual(401)
    })

    it('Should respond with a 500 status code if there was an issue writing to the database', async function() {
      const collectionSpy = jest.spyOn(db, 'collection')
      const err = new Error('Error message')
      const uri = `/product/${target._id.toString()}`
      
      collectionSpy.mockImplementation(() => { throw err })

      const res =
        await supertest(app)
          .patch(uri)
          .send({})
          .set('Content-Type', 'application/json')

      expect(console.error).toHaveBeenCalledWith('PATCH', uri, err)
      expect(res.status).toEqual(500)

      collectionSpy.mockRestore()
    })
  })

  describe('DELETE', function() {
    let target: Document
    let expectedProducts: Document[]

    beforeAll(async function() {
      target = await productsCollection.findOne({name: 'The first product'})
      const products = await productsCollection.find({}).toArray()
      expectedProducts = products.filter(product => product._id.toString() !== target._id.toString())
    })

    it('Should delete an entry', async function() {      
      const res = await supertest(app).delete(`/product/${target._id.toString()}`)

      expect(console.error).not.toBeCalled()
      expect(res.status).toEqual(200)
      expect(await productsCollection.find().toArray()).toEqual(expectedProducts)
    })

    it('Should respond with a 404 status code if the entry does not exist', async function() {
      const randomId = new ObjectId()

      const res = await supertest(app).delete(`/product/${randomId.toString()}`)
          
      expect(console.error).not.toHaveBeenCalled()
      expect(res.status).toEqual(404)
    })
    
    it('Should respond with a 401 status code if the token is invalid', async function() {
      checkJwlMocked.mockImplementation((req, res, next) => res.sendStatus(401))

      const res = await supertest(app).delete(`/product/${target._id.toString()}`)
      
      expect(res.status).toEqual(401)
    })

    it('should respond with a 401 status code if the token does not relate to an authorized role', async function() {
      jwtAuthzMocked.jwtAuthzHandler.mockImplementation((req, res, next) => res.sendStatus(401))
      
      const res = await supertest(app).delete(`/product/${target._id.toString()}`)
      
      expect(res.status).toEqual(401)
    })

    it('Should respond with a 500 status code if there was an issue writing to the database', async function() {
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