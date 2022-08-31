import { ObjectId } from 'mongodb'

import generateImageDataForResponse from '../../src/utils/generateImageDataForResponse'

describe('utils/generateImageDataForResponse', function() {
  
  
  it('Should generate image data for a response', function() {
    const image = {
      _id: new ObjectId(),
      contentType: 'image/png'
    }
    
    const imageData = generateImageDataForResponse(image, 'foo')
    const _id = image._id.toString()

    expect(imageData).toEqual({
      _id,
      url: `foo/image/${_id}.png`
    })
  })

  it('Should default the file extension to "jpeg" if one could not be found via the contentType', function() {
    const image = {
      _id: new ObjectId(),
      contentType: 'invalid'
    }
    
    const imageData = generateImageDataForResponse(image, 'foo')
    const _id = image._id.toString()

    expect(imageData).toEqual({
      _id,
      url: `foo/image/${_id}.jpeg`
    })
  })
})