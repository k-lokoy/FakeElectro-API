import { Router } from 'express'

import { clientPromise } from '../database'

const categoriesRouter = Router()

categoriesRouter.get('/', async function(req, res) {
  try {
    const client = await clientPromise
    const categories = await client.db(process.env.MONGODB_DB_NAME).collection('Categories').find().toArray()

    res.status(200).send(categories.map(({ slug, name }) => ({slug, name})))
  
  } catch (err) {
    console.error(req.method, req.originalUrl, err)
    res.sendStatus(500)
  }
})

export default categoriesRouter