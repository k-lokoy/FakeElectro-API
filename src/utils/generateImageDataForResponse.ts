import { ObjectId } from 'mongodb'
import mongoose from 'mongoose'

export default async function generateImageDataForResponse(_id: ObjectId, url: string) {
  try {
    const image = await mongoose.connection.collection('images.files').findOne({_id})
    const ext = image.contentType.match(/\/(.*)/)?.[1] || 'jpeg'
    
    return {_id, url: `${url}/image/${_id.toString()}.${ext}`}
  
  } catch (err) {
    console.error(err)
    return {_id}
  }
}