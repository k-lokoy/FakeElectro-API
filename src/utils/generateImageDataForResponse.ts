import { Document } from 'mongodb'

export default function generateImageDataForResponse(image: Document, url: string) {
  const ext = image.contentType.match(/\/(.*)/)?.[1] || 'jpeg'
  const _id = image._id.toString()
        
  return {_id, url: `${url}/image/${_id}.${ext}`}
}