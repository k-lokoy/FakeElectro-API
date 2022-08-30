import getURLFromRequest from '../../src/utils/getURLFromRequest'

describe('utils/getURLFromRequest', function() {
  let initialPort
  const req = {
    protocol: 'foo',
    hostname: 'bar',
  }

  beforeAll(function() {
    initialPort = process.env.PORT
    process.env.PORT = '3000'
  })

  afterAll(function() {
    process.env.PORt = initialPort
  })

  it('Should generate a URL for the API from a request', function() {
    expect(getURLFromRequest(req)).toEqual('foo://bar:3000')
  })
  
  it('Should not add a port for ports 8080 and 80', function() {
    process.env.PORT = '8080'
    expect(getURLFromRequest(req)).toEqual('foo://bar')
  
    process.env.PORT = '80'
    expect(getURLFromRequest(req)).toEqual('foo://bar')
  })
})