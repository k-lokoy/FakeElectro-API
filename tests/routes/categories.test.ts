import supertest from 'supertest'
import express from 'express'

// Types
import { Collection, Db, Document } from 'mongodb'
import { Express } from 'express-serve-static-core'

import { getDb } from '../../src/database'
import categoriesRouter from '../../src/routes/categories'

describe('routes/categories', function() {
  let collection: Collection<Document>
  let app: Express
  let db: Db
  
  beforeAll(async function() {
    db = await getDb()
    collection = db.collection('Categories')
    app = express()

    app.use('/categories', categoriesRouter)

    await collection.insertOne({slug: 'foo', name: 'Foo'})
    await collection.insertOne({slug: 'bar', name: 'Bar'})

    jest.spyOn(console, 'error')
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
      const collectionSpy = jest.spyOn(db, 'collection')
      
      const err = new Error('Error message')
      collectionSpy.mockImplementation(() => { throw err })

      const res = await supertest(app).get('/categories')

      expect(console.error).toHaveBeenCalledWith('GET', '/categories', err)
      expect(res.status).toEqual(500)
    })
  })
})