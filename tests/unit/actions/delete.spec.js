import { beforeEach, describe, expect, test } from 'vitest'
import sinonChai from 'sinon-chai'
import chai from 'chai'
chai.use(sinonChai)

import { makeApi } from '../server'
let api, mockApi

import createStubContext from '../stubs/context'
import createJsonapiModule from '../utils/createJsonapiModule'
import { jsonFormat as createJsonWidget1, normFormat as createNormWidget1 } from '../fixtures/widget1'

describe('delete', function () {
  let jsonWidget1, normWidget1, jsonapiModule, stubContext

  beforeEach(function () {
    ;[api, mockApi] = makeApi()
    jsonWidget1 = createJsonWidget1()
    normWidget1 = createNormWidget1()

    jsonapiModule = createJsonapiModule(api)
    stubContext = createStubContext(jsonapiModule)
  })

  test('should make an api call to DELETE item(s)', async function () {
    mockApi.onAny().reply(204)

    await jsonapiModule.actions.delete(stubContext, normWidget1)

    expect(mockApi.history.delete[0].url).to.equal(normWidget1['_jv']['links']['self'])
  })

  test('should accept axios config as the 2nd arg in a list', async function () {
    mockApi.onAny().reply(200, { data: jsonWidget1 })
    const params = { filter: 'color' }

    await jsonapiModule.actions.delete(stubContext, [normWidget1, { params: params }])

    expect(mockApi.history.delete[0].params).to.deep.equal(params)
  })

  test('should allow the endpoint url to be overridden in config', async function () {
    mockApi.onAny().reply(200, { data: jsonWidget1 })
    const url = '/fish/1'

    await jsonapiModule.actions.delete(stubContext, [normWidget1, { url: url }])
    expect(mockApi.history.delete[0].url).to.equal(url)
  })

  test('should delete a record from the store', async function () {
    mockApi.onAny().reply(204)

    await jsonapiModule.actions.delete(stubContext, normWidget1)

    expect(stubContext.commit).to.have.been.calledWith('deleteRecord', normWidget1)
  })

  test('should delete a record (string) from the store', async function () {
    mockApi.onAny().reply(204)

    // Leading slash is incorrect syntax, but we should handle it so test with it in
    await jsonapiModule.actions.delete(stubContext, 'widget/1')

    expect(stubContext.commit).to.have.been.calledWith('deleteRecord', 'widget/1')
  })

  test('should return deleted object if passed back by server', async function () {
    mockApi.onAny().reply(200, { data: jsonWidget1 })

    // Leading slash is incorrect syntax, but we should handle it so test with it in
    let res = await jsonapiModule.actions.delete(stubContext, normWidget1)

    expect(res).to.deep.equal(normWidget1)
  })

  test('should handle API errors', async function () {
    mockApi.onAny().reply(500)

    try {
      await jsonapiModule.actions.delete(stubContext, normWidget1)
    } catch (error) {
      expect(error.response.status).to.equal(500)
    }
  })
})
