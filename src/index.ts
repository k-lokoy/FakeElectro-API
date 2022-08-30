import dotenv from 'dotenv'
dotenv.config()

import express from 'express'
import cors from 'cors'
import bodyParser from 'body-parser'

import productsRouter from './routes/products'
import productRouter from './routes/product'
import categoriesRouter from './routes/categories'
import categoryRouter from './routes/category'
import imageRouter from './routes/image'

const app = express()

app.use(cors())
app.use(bodyParser.urlencoded({extended: true}))
app.use(bodyParser.json())

app.use('/products', productsRouter)
app.use('/product', productRouter)
app.use('/categories', categoriesRouter)
app.use('/category', categoryRouter)
app.use('/image', imageRouter)

const port: string = process.env.PORT || '8080'
app.listen(port, () => console.log(`API listening on port ${port}`))