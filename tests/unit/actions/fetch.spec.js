import { expect } from 'chai'

import createJsonapiModule from '../utils/createJsonapiModule'

describe('fetch', function () {
  let jsonapiModule

  beforeEach(function () {
    jsonapiModule = createJsonapiModule(this.api)
  })

  it('should be an alias for get', function () {
    expect(jsonapiModule.actions.fetch).to.equal(jsonapiModule.actions.get)
  })
})
