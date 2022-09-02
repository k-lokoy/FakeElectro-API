import supertest from 'supertest'
import express from 'express'
import mongoose from 'mongoose'
import { MongoMemoryServer } from 'mongodb-memory-server'
import { Express } from 'express-serve-static-core'

import { Category } from '../../src/database'
import categoriesRouter from '../../src/routes/categories'

describe('routes/categories', function() {
  let app: Express
  
  beforeAll(async function() {
    const mongoServer = await MongoMemoryServer.create()

    await mongoose.connect(mongoServer.getUri())

    app = express()

    app.use('/categories', categoriesRouter)

    await Category.collection.insertOne({slug: 'foo', name: 'Foo'})
    await Category.collection.insertOne({slug: 'bar', name: 'Bar'})

    jest.spyOn(console, 'error')
  })

  afterAll(async () => {
    await mongoose.disconnect()
    await mongoose.connection.close()
  })

  describe('GET', function() {
    it('Should respond with an array of categories', async function() {
      const res = await supertest(app).get('/categories')

      expect(console.error).not.toHaveBeenCalled()
      expect(res.status).toEqual(200)
      expect(JSON.parse(res.text)).toEqual([
        {slug: 'foo', name: 'Foo'},
        {slug: 'bar', name: 'Bar'},
      ])
    })

    it('Should respond with a 500 status code if there was an issue getting data from the database', async function() {
      const findSpy = jest.spyOn(Category, 'find')
      
      const err = new Error('Error message')
      findSpy.mockImplementation(() => { throw err })

      const res = await supertest(app).get('/categories')

      expect(console.error).toHaveBeenCalledWith('GET', '/categories', err)
      expect(res.status).toEqual(500)
    })
  })
})