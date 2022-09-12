import { ObjectId } from 'mongodb'

import generateImageDataForResponse from '../../src/utils/generateImageDataForResponse'

describe('utils/generateImageDataForResponse', function() {
  it.skip('Should generate image data for a response', function() {
    const _id = new ObjectId()
    const imageData = generateImageDataForResponse(_id, 'foo')
    
    expect(imageData).toEqual({
      _id: _id.toString(),
      url: `foo/image/${_id}.png`
    })
  })

  it.skip('Should default the file extension to "jpeg" if one could not be found via the contentType', function() {
    const _id = new ObjectId()
    const imageData = generateImageDataForResponse(_id, 'foo')
    
    expect(imageData).toEqual({
      _id: _id.toString(),
      url: `foo/image/${_id}.jpeg`
    })
  })
})