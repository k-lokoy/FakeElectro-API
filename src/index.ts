import dotenv from 'dotenv'
dotenv.config()

import express from 'express'
import cors from 'cors'
import bodyParser from 'body-parser'

import productsRouter from './routes/products'
import productRouter from './routes/product'
import categoriesRouter from './routes/categories'
import imgRouter from './routes/img'

const app = express()

app.use(cors())
app.use(bodyParser.urlencoded({extended: true}))
app.use(bodyParser.json())

app.use('/products', productsRouter)
app.use('/product', productRouter)
app.use('/categories', categoriesRouter)
app.use('/img', imgRouter)

const port = process.env.PORT || 3000
app.listen(port, () => console.log(`API listening on port ${port}`))