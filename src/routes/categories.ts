import { Router } from 'express'

import { Category } from '../database'

const categoriesRouter = Router()

categoriesRouter.get('/', async function(req, res) {
  try {
    const categories = await Category.find()

    res.status(200).send(categories.map(({ slug, name }) => ({slug, name})))
  
  } catch (err) {
    console.error(req.method, req.originalUrl, err)
    res.sendStatus(500)
  }
})

export default categoriesRouter