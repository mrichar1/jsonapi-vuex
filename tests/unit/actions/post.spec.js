import { beforeEach, describe, expect, test } from 'vitest'
import sinonChai from 'sinon-chai'
import chai from 'chai'
chai.use(sinonChai)

import { makeApi } from '../server'
let api, mockApi

import createStubContext from '../stubs/context'
import createJsonapiModule from '../utils/createJsonapiModule'
import { jsonFormat as createJsonWidget1, normFormat as createNormWidget1 } from '../fixtures/widget1'

describe('post', function () {
  let jsonWidget1, normWidget1, jsonapiModule, stubContext

  beforeEach(function () {
    ;[api, mockApi] = makeApi()
    jsonWidget1 = createJsonWidget1()
    normWidget1 = createNormWidget1()

    jsonapiModule = createJsonapiModule(api)
    stubContext = createStubContext(jsonapiModule)
  })

  test('should make an api call to POST item(s)', async function () {
    mockApi.onAny().reply(201, { data: jsonWidget1 })

    await jsonapiModule.actions.post(stubContext, normWidget1)

    expect(mockApi.history.post[0].url).to.equal(`${normWidget1['_jv']['type']}`)
  })

  test('should accept axios config as the 2nd arg in a list', async function () {
    mockApi.onAny().reply(201, { data: jsonWidget1 })
    const params = { filter: 'color' }

    await jsonapiModule.actions.post(stubContext, [normWidget1, { params: params }])

    expect(mockApi.history.post[0].params).to.deep.equal(params)
  })

  test('should allow the endpoint url to be overridden in config', async function () {
    mockApi.onAny().reply(200, { data: jsonWidget1 })
    const url = '/fish/1'

    await jsonapiModule.actions.post(stubContext, [normWidget1, { url: url }])
    expect(mockApi.history.post[0].url).to.equal(url)
  })

  test('should add record(s) to the store', async function () {
    mockApi.onAny().reply(201, { data: jsonWidget1 })

    await jsonapiModule.actions.post(stubContext, normWidget1)

    expect(stubContext.commit).to.have.been.calledWith('addRecords', normWidget1)
  })

  test('should add record(s) in the store (no server response)', async function () {
    mockApi.onAny().reply(204)

    await jsonapiModule.actions.post(stubContext, normWidget1)

    expect(stubContext.commit).to.have.been.calledWith('addRecords', normWidget1)
  })

  test("should return data via the 'get' getter", async function () {
    mockApi.onAny().reply(201, { data: jsonWidget1 })

    await jsonapiModule.actions.post(stubContext, normWidget1)

    expect(stubContext.getters.get).to.have.been.calledWith(normWidget1)
  })

  test('should POST data', async function () {
    mockApi.onAny().reply(201, { data: jsonWidget1 })

    await jsonapiModule.actions.post(stubContext, normWidget1)

    // History stores data as JSON string, so parse back to object
    expect(JSON.parse(mockApi.history.post[0].data)).to.deep.equal({
      data: jsonWidget1,
    })
  })

  test('should preserve json in _jv in returned data', async function () {
    let jsonapiModule = createJsonapiModule(api, { preserveJson: true })
    mockApi.onAny().reply(201, { data: jsonWidget1 })

    let res = await jsonapiModule.actions.post(stubContext, normWidget1)

    // json should now be nested in _jv
    expect(res['_jv']).to.have.keys('json')
  })

  test('should handle API errors', async function () {
    mockApi.onAny().reply(500)

    try {
      await jsonapiModule.actions.post(stubContext, normWidget1)
    } catch (error) {
      expect(error.response.status).to.equal(500)
    }
  })
})
