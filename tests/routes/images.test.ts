import supertest from 'supertest'
import express from 'express'
import { Express } from 'express-serve-static-core'
import { Db, Collection, Document, ObjectId } from 'mongodb'

import { getDb } from '../../src/database'
import imagesRouter from '../../src/routes/images'

describe('routes/images', function() {
  let imagesCollection: Collection<Document>
  let app: Express
  let db: Db
  
  beforeAll(async function() {
    db = await getDb()
    imagesCollection = db.collection('images.files')
    app = express()

    app.use('/images', imagesRouter)

    await Promise.all([
      imagesCollection.insertOne({
        _id:         new ObjectId(),
        contentType: 'image/jpeg',
        uploadDate:  '1970-01-01',
        filename:    'foo.jpg',
      }),
      imagesCollection.insertOne({
        _id:         new ObjectId(),
        contentType: 'unknown',
        uploadDate:  '2020-12-24',
        filename:    'bar.jpg',
      }),
      imagesCollection.insertOne({
        _id:         new ObjectId(),
        contentType: 'image/png',
        uploadDate:  '2000-01-01',
        filename:    'baz.png',
      })
    ])

    jest.spyOn(console, 'error')
  })

  describe('GET', function() {
    it('Should respond with an array of images in the database', async function() {
      const res: any = await supertest(app).get('/images')
      const table = await imagesCollection.find({}).toArray()

      expect(console.error).not.toHaveBeenCalled()
      expect(res.status).toEqual(200)
      expect(JSON.parse(res.text)).toEqual([
        {
          _id:         table[0]._id.toString(),
          filename:   'foo.jpg',
          type:       'image/jpeg',
          uploadDate: '1970-01-01',
          url:        `${res.request.protocol}//${res.req.host}/image/${table[0]._id.toString()}.jpeg`
       },
       {
         _id:         table[1]._id.toString(),
         filename:   'bar.jpg',
         type:       'unknown',
         uploadDate: '2020-12-24',
         url:        `${res.request.protocol}//${res.req.host}/image/${table[1]._id.toString()}.jpeg`
       },
       {
         _id:         table[2]._id.toString(),
         filename:   'baz.png',
         type:       'image/png',
         uploadDate: '2000-01-01',
         url:        `${res.request.protocol}//${res.req.host}/image/${table[2]._id.toString()}.png`
        }
      ])
    })

    it('Should respond with an empty array if there are no image sin the database', async function() {
      await imagesCollection.drop()

      const res: any = await supertest(app).get('/images')

      expect(console.error).not.toHaveBeenCalled()
      expect(res.status).toEqual(200)
      expect(JSON.parse(res.text)).toEqual([])
    })

    it('should respond with a 500 status code if there was an issue reading the database', async function() {
      const collectionSpy = jest.spyOn(db, 'collection')
        
      const err = new Error('Error message')
      collectionSpy.mockImplementation(() => { throw err })

      const res: any = await supertest(app).get('/images')

      expect(console.error).toHaveBeenCalledWith('GET', '/images', err)
      expect(res.status).toEqual(500)

      collectionSpy.mockRestore()
    })
  })
})