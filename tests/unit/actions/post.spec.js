import { expect } from 'chai'

import createStubContext from '../stubs/context'
import createJsonapiModule from '../utils/createJsonapiModule'
import {
  jsonFormat as createJsonWidget1,
  normFormat as createNormWidget1,
} from '../fixtures/widget1'

describe('post', function() {
  let jsonWidget1, normWidget1, jsonapiModule, stubContext

  beforeEach(function() {
    jsonWidget1 = createJsonWidget1()
    normWidget1 = createNormWidget1()

    jsonapiModule = createJsonapiModule(this.api)
    stubContext = createStubContext(jsonapiModule)
  })

  it('should make an api call to POST item(s)', async function() {
    this.mockApi.onAny().reply(201, { data: jsonWidget1 })

    await jsonapiModule.actions.post(stubContext, normWidget1)

    expect(this.mockApi.history.post[0].url).to.equal(
      `${normWidget1['_jv']['type']}`
    )
  })

  it('should accept axios config as the 2nd arg in a list', async function() {
    this.mockApi.onAny().reply(201, { data: jsonWidget1 })
    const params = { filter: 'color' }

    await jsonapiModule.actions.post(stubContext, [
      normWidget1,
      { params: params },
    ])

    expect(this.mockApi.history.post[0].params).to.deep.equal(params)
  })

  it('should allow the endpoint url to be overridden in config', async function() {
    this.mockApi.onAny().reply(200, { data: jsonWidget1 })
    const url = '/fish/1'

    await jsonapiModule.actions.post(stubContext, [normWidget1, { url: url }])
    expect(this.mockApi.history.post[0].url).to.equal(url)
  })

  it('should add record(s) to the store', async function() {
    this.mockApi.onAny().reply(201, { data: jsonWidget1 })

    await jsonapiModule.actions.post(stubContext, normWidget1)

    expect(stubContext.commit).to.have.been.calledWith(
      'addRecords',
      normWidget1
    )
  })

  it('should add record(s) in the store (no server response)', async function() {
    this.mockApi.onAny().reply(204)

    await jsonapiModule.actions.post(stubContext, normWidget1)

    expect(stubContext.commit).to.have.been.calledWith(
      'addRecords',
      normWidget1
    )
  })

  it("should return data via the 'get' getter", async function() {
    this.mockApi.onAny().reply(201, { data: jsonWidget1 })

    await jsonapiModule.actions.post(stubContext, normWidget1)

    expect(stubContext.getters.get).to.have.been.calledWith(normWidget1)
  })

  it('should POST data', async function() {
    this.mockApi.onAny().reply(201, { data: jsonWidget1 })

    await jsonapiModule.actions.post(stubContext, normWidget1)

    // History stores data as JSON string, so parse back to object
    expect(JSON.parse(this.mockApi.history.post[0].data)).to.deep.equal({
      data: jsonWidget1,
    })
  })

  it('should preserve json in _jv in returned data', async function() {
    let jsonapiModule = createJsonapiModule(this.api, { preserveJson: true })
    this.mockApi.onAny().reply(201, { data: jsonWidget1 })

    let res = await jsonapiModule.actions.post(stubContext, normWidget1)

    // json should now be nested in _jv
    expect(res['_jv']).to.have.keys('json')
  })

  it('should handle API errors', async function() {
    this.mockApi.onAny().reply(500)

    try {
      await jsonapiModule.actions.post(stubContext, normWidget1)
    } catch (error) {
      expect(error.response.status).to.equal(500)
    }
  })
})
