import dotenv from 'dotenv'
dotenv.config()

import express from 'express'
import cors from 'cors'
import bodyParser from 'body-parser'
import mongoose from 'mongoose'

import productsRouter from './routes/products'
import productRouter from './routes/product'
import categoriesRouter from './routes/categories'
import categoryRouter from './routes/category'
import imagesRouter from './routes/images'
import imageRouter from './routes/image'

if ('test' !== process.env.NODE_ENV && !process.env.MONGODB_CONNECTION_STRING)
  throw new Error('Missing database connection string.')

const app = express()

app.use(cors())
app.use(bodyParser.urlencoded({extended: true}))
app.use(bodyParser.json())

app.use('/products', productsRouter)
app.use('/product', productRouter)
app.use('/categories', categoriesRouter)
app.use('/category', categoryRouter)
app.use('/images', imagesRouter)
app.use('/image', imageRouter)

mongoose.connect(
  process.env.MONGODB_CONNECTION_STRING,
  {dbName: process.env.MONGODB_DB_NAME}
)

const port: string = process.env.PORT || '8080'
app.listen(port, () => console.log(`API listening on port ${port}`))