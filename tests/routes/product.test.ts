import supertest from 'supertest'
import express from 'express'
import bodyParser from 'body-parser'
import { ObjectId, WithId } from 'mongodb'
import { MongoMemoryServer } from 'mongodb-memory-server'
import mongoose from 'mongoose'
import * as jwtAuthz from 'express-jwt-authz'
import { Express } from 'express-serve-static-core'

import { Category, Product } from '../../src/database'
import productRouter from '../../src/routes/product'
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
  
  beforeAll(async function() {
    const mongoServer = await MongoMemoryServer.create()
    app = express()

    await mongoose.connect(mongoServer.getUri())

    const insertedCategories = await Category.insertMany([
      {slug: 'foo', name: 'Foo'},
      {slug: 'bar', name: 'Bar'},
    ])
    
    const insertedImages = await mongoose.connection.collection('images.files').insertMany([
      {filename: 'foobar.jpg', contentType: 'images/jpeg'},
      {filename: 'foobaz.png', contentType: 'images/png'},
    ])

    await Product.insertMany([
      {
        name: 'The first product',
        category: insertedCategories[0]._id,
        description: 'Description about the first product.',
        price: 55.5,
        in_stock: 12,
        image: insertedImages.insertedIds[0],
        rating: {
          rate: 5,
          count: 99
        }
      },
      {
        name: 'The second product',
        category: insertedCategories[1]._id,
        description: 'Description about the second product.',
        price: 100,
        in_stock: 0,
        rating: {
          rate: 3,
          count: 4
        },
      }
    ])
   
    app.use(bodyParser.json())
    app.use(bodyParser.urlencoded({extended: true}))
    app.use('/product', productRouter)
    
    jest.spyOn(console, 'error')
  })

  beforeEach(function() {
    checkJwlMocked.mockImplementation((req, res, next) => next())
    jwtAuthzMocked.jwtAuthzHandler.mockImplementation((req, res, next) => next())
  })

  afterAll(async () => {
    await mongoose.disconnect()
    await mongoose.connection.close()
  })

  describe('GET', function() {
    let target

    beforeAll(async function() {
      target = await Product.findOne({name: 'The first product'})
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
        image: {
          _id: target.image.toString(),
          url: `${res.request.protocol}//${res.req.host}/image/${target.image.toString()}.jpeg`
        },
        rating: {
          rate: 5,
          count: 99
        },
      })
    })

    it('Should respond with a 404 status code if there was an issue getting data from the database', async function() {
      const randomId = new ObjectId()
      const uri = `/product/${randomId.toString()}`
      const res: any  = await supertest(app).get(uri)

      expect(console.error).not.toHaveBeenCalled()
      expect(res.status).toEqual(404)
    })

    it('Should respond with a 500 status code if the category doe snot exist', async function() {
      const findOneSpy = jest.spyOn(Category, 'findOne')
      
      const err = new Error('Error message')
      findOneSpy.mockImplementation(() => { throw err })

      const uri = `/product/${target._id.toString()}`
      const res: any  = await supertest(app).get(uri)

      expect(console.error).toHaveBeenCalledWith('GET', uri, err)
      expect(res.status).toEqual(500)

      findOneSpy.mockRestore()
    })
  })

  describe('POST', function() {
    let image: WithId<mongoose.AnyObject>
    
    const body = {
      name: 'foobar',
      category: 'foo',
      price: 100,
      in_stock: 12,
      image: null,
      rating: {
        rate: 50,
        count: 10
      }
    }

    beforeAll(async function() {
      image = await mongoose.connection.collection('images.files').findOne({filename: 'foobaz.png'})
      body.image = image._id.toString()
    })

    it('Should add a product to the database', async function() {
      const res: any =
        await supertest(app)
          .post('/product')
          .send(body)
          .set('Content-Type', 'application/json')
          
      const { __v, ...product } = await Product.findOne({_id: new ObjectId(res.text)}).lean()
      
      expect(console.error).not.toHaveBeenCalled()

      const expectedProduct = {
        _id: new ObjectId(res.text),
        name: 'foobar',
        category: (await Category.findOne({slug: 'foo'}))._id,
        description: '',
        image: image._id,
        price: 100,
        in_stock: 12,
        rating: {
          _id: expect.anything(),
          rate: 50,
          count: 10
        }
      }
      
      expect(product).toEqual(expectedProduct)
      expect(res.status).toEqual(201)
      expect(res.text).toEqual(product._id.toString())
    })

    it('Should respond with a 406 status code if the category is invalid', async function() {
      const res =
        await supertest(app)
          .post('/product')
          .send({...body, category: 'invalid'})
          .set('Content-Type', 'application/json')

      const products = await Product.find()

      expect(products.length).toEqual(3)
      expect(res.status).toEqual(406)
      expect(res.text).toEqual('Invalid category')
    })

    it('Should respond with a 406 status code if the data could not be validated', async function() {
      const res =
        await supertest(app)
          .post('/product')
          .send({category: body.category})
          .set('Content-Type', 'application/json')

      expect(res.status).toEqual(406)
      expect(res.text).toEqual('ValidatorError: Path `rating` is required.')
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
      const insertOneSpy = jest.spyOn(Product.collection, 'insertOne')
      const err = new Error('Error message')

      insertOneSpy.mockImplementation(() => { throw err })

      const res =
        await supertest(app)
          .post('/product')
          .send(body)
          .set('Content-Type', 'application/json')

      expect(console.error).toHaveBeenCalledWith('POST', '/product', err)
      expect(res.status).toEqual(500)

      insertOneSpy.mockRestore()
    })
  })

  describe('PUT', function() {
    let product: Product
    let body: any
    let expectedProduct: any

    beforeAll(async function() {
      product = await Product.findOne({name: 'The first product'})
    
      body = {
        name: product.name,
        category: 'bar',
        price: 500,
        in_stock: 501,
        rating: {
          rate: 50,
          count: 5
        }
      }

      expectedProduct = {
        _id: product._id,
        name: product.name,
        category: (await Category.findOne({slug: 'bar'}))._id,
        price: 500,
        in_stock: 501,
        rating: {
          _id: expect.anything(),
          rate: 50,
          count: 5
        }
      }
    })
    
    it('should replace a database entry', async function() {
      const res =
        await supertest(app)
          .put(`/product/${product._id.toString()}`)
          .send(body)
          .set('Content-Type', 'application/json')

      expect(console.error).not.toHaveBeenCalled()
      expect(res.status).toEqual(200)
      expect(await Product.findOne({_id: product._id}).lean()).toEqual(expectedProduct)
    })

    it('Should ignore additional properties', async function() {
      const res =
        await supertest(app)
          .put(`/product/${product._id.toString()}`)
          .send({...body, foo: 'bar'})
          .set('Content-Type', 'application/json')

      expect(console.error).not.toHaveBeenCalled()
      expect(res.status).toEqual(200)
      expect(await Product.findOne({_id: product._id}).lean()).toEqual(expectedProduct)
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
      const res =
        await supertest(app)
          .put(`/product/${product._id.toString()}`)
          .send({...body, category: 'invalid'})
          .set('Content-Type', 'application/json')

      expect(console.error).not.toHaveBeenCalled()
      expect(res.status).toEqual(406)
      expect(res.text).toEqual('Invalid category')
    })

    it('Should respond with a 406 status code if the data could not be validated', async function() {
      const res =
        await supertest(app)
          .put(`/product/${product._id.toString()}`)
          .send({...body, price: 'foobar'})
          .set('Content-Type', 'application/json')

      expect(console.error).not.toHaveBeenCalled()
      expect(res.status).toEqual(406)
      expect(res.text).toEqual('CastError: Cast to Number failed for value "foobar" (type string) at path "price"')
    })

    it('Should respond with a 401 status code if the token is invalid', async function() {
      checkJwlMocked.mockImplementation((req, res, next) => res.sendStatus(401))

      const res =
        await supertest(app)
          .put(`/product/${product._id.toString()}`)
          .send(body)
          .set('Content-Type', 'application/json')
      
      expect(res.status).toEqual(401)
    })

    it('should respond with a 401 status code if the token does not relate to an authorized role', async function() {
      jwtAuthzMocked.jwtAuthzHandler.mockImplementation((req, res, next) => res.sendStatus(401))
      
      const res =
        await supertest(app)
          .put(`/product/${product._id.toString()}`)
          .send(body)
          .set('Content-Type', 'application/json')
    
      expect(res.status).toEqual(401)
    })

    it('Should respond with a 500 status code if there was an issue writing to the database', async function() {
      const findOneAndReplaceSpy = jest.spyOn(Product, 'findOneAndReplace')
      const err = new Error('Error message')
      const uri = `/product/${product._id.toString()}`
      
      findOneAndReplaceSpy.mockImplementation(() => { throw err })

      const res =
        await supertest(app)
          .put(uri)
          .send(body)
          .set('Content-Type', 'application/json')

      expect(console.error).toHaveBeenCalledWith('PUT', uri, err)
      expect(res.status).toEqual(500)

      findOneAndReplaceSpy.mockRestore()
    })
  })
  
  describe('PATCH', function() {
    let product: Product

    beforeEach(async function() {
      product = await Product.findOne({name: 'The first product'}).lean()
    })

    it('Should add and replace data to an entry', async function() {
      const category = await Category.findOne({slug: 'foo'})
      const imageId = new ObjectId()

      const res =
        await supertest(app)
          .patch(`/product/${product._id.toString()}`)
          .send({
            category: 'foo',
            image: imageId.toString(),
            price: 1000
          })
          .set('Content-Type', 'application/json')

      expect(console.error).not.toBeCalled()
      expect(res.status).toEqual(200)
      
      const actualProduct = await Product.findOne({_id: product._id}).lean()
      const expectedProduct: Product = {
        ...product,
        category: category._id,
        image: imageId,
        price: 1000,
      }

      expect(actualProduct).toEqual(expectedProduct)
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
          .patch(`/product/${product._id.toString()}`)
          .send({category: 'invalid'})
          .set('Content-Type', 'application/json')

      expect(console.error).not.toHaveBeenCalled()
      expect(res.status).toEqual(406)
      expect(res.text).toEqual('Invalid category')
    })

    it('Should respond with a 406 status code if the data could not be validated', async function() {
      const res =
        await supertest(app)
          .patch(`/product/${product._id.toString()}`)
          .send({price: 'foobar'})
          .set('Content-Type', 'application/json')

      expect(res.status).toEqual(406)
      expect(res.text).toEqual('CastError: Cast to Number failed for value "foobar" (type string) at path "price"')
    })

    it('Should respond with a 401 status code if the token is invalid', async function() {
      checkJwlMocked.mockImplementation((req, res, next) => res.sendStatus(401))

      const res =
        await supertest(app)
          .patch(`/product/${product._id.toString()}`)
          .send({})
          .set('Content-Type', 'application/json')
      
      expect(res.status).toEqual(401)
    })

    it('should respond with a 401 status code if the token does not relate to an authorized role', async function() {
      jwtAuthzMocked.jwtAuthzHandler.mockImplementation((req, res, next) => res.sendStatus(401))
      
      const res =
        await supertest(app)
          .patch(`/product/${product._id.toString()}`)
          .send({})
          .set('Content-Type', 'application/json')
    
      expect(res.status).toEqual(401)
    })

    it('Should respond with a 500 status code if there was an issue writing to the database', async function() {
      const findOneAndUpdateSpy = jest.spyOn(Product, 'findOneAndUpdate')
      const err = new Error('Error message')
      const uri = `/product/${product._id.toString()}`
      
      findOneAndUpdateSpy.mockImplementation(() => { throw err })

      const res =
        await supertest(app)
          .patch(uri)
          .send({})
          .set('Content-Type', 'application/json')

      expect(console.error).toHaveBeenCalledWith('PATCH', uri, err)
      expect(res.status).toEqual(500)

      findOneAndUpdateSpy.mockRestore()
    })
  })

  describe('DELETE', function() {
    let target: Product
    let expectedProducts: Product[]

    beforeAll(async function() {
      target = await Product.findOne({name: 'The first product'})
      const products = await Product.find().lean()
      expectedProducts = products.filter(product => product._id.toString() !== target._id.toString())
    })

    it('Should respond with a 500 status code if there was an issue writing to the database', async function() {
      const deleteOneSpy = jest.spyOn(Product, 'deleteOne')
      const err = new Error('Error message')
      const uri = `/product/${target._id.toString()}`
      
      deleteOneSpy.mockImplementation(() => { throw err })

      const res = await supertest(app).delete(uri)
    
      expect(res.status).toEqual(500)
      expect(console.error).toHaveBeenCalledWith('DELETE', uri, err)

      deleteOneSpy.mockRestore()
    })

    it('Should delete an entry', async function() {      
      const res = await supertest(app).delete(`/product/${target._id.toString()}`)

      expect(console.error).not.toBeCalled()
      expect(res.status).toEqual(200)
      expect(await Product.find().lean()).toEqual(expectedProducts)
    })

    it('Should respond with a 404 status code if the entry does not exist', async function() {
      const res = await supertest(app).delete(`/product/${target._id.toString()}`)
          
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
  })
})