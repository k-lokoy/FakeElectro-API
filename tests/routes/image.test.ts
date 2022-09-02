import supertest from 'supertest'
import express from 'express'
import bodyParser from 'body-parser'
import { Collection, Db, Document, ObjectId } from 'mongodb'
import * as jwtAuthz from 'express-jwt-authz'

import imageRouter from '../../src/routes/image'

describe('routes/image', function() {

  describe('GET', function() {
    it.todo('Should respond with a stream of image data')
    it.todo('Should respond with a 404 status code if there\'s no image')
    it.todo('should respond with a 500 status code if there was an issue reading the database')
  })
  
  describe('POST', function() {
    it.todo('Should add a new image to the database and respond with its ID')
    it.todo('Should not add a duplicate image to the dabase, but respond with the existing image\'s ID')
    it.todo('Should respond with a 406 status code if there\'s a no file in the request header')
    it.todo('Should respond with a 500 status code if there was an issue writing to the database')
  })
  
  describe('DELETE', function() {
    it.todo('Should delete an image from the database')
    it.todo('Should respond with a 404 status code if the image does not exist in the database')
    it.todo('Should respond with a 500 status code if there was an issue updating the database')
  })

})
