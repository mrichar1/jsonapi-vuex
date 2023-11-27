import { beforeEach, describe, expect, test } from 'vitest'
import sinonChai from 'sinon-chai'
import chai from 'chai'
import sinon from 'sinon'
chai.use(sinonChai)

import { setActivePinia, createPinia } from 'pinia'
import { makeApi } from '../server'
let api, mockApi

import defaultJsonapiStore from '../utils/defaultJsonapiStore'
import { jsonFormat as createJsonWidget1, normFormat as createNormWidget1 } from '../fixtures/widget1'

describe('delete', function () {
  let jsonWidget1, normWidget1, store

  beforeEach(function () {
    ;[api, mockApi] = makeApi()
    jsonWidget1 = createJsonWidget1()
    normWidget1 = createNormWidget1()

    setActivePinia(createPinia())
    let { jsonapiStore } = defaultJsonapiStore(api)
    store = jsonapiStore()

  })

  test('should make an api call to DELETE item(s)', async function () {
    mockApi.onAny().reply(204)

    await store.delete(normWidget1)

    expect(mockApi.history.delete[0].url).to.equal(normWidget1['_jv']['links']['self'])
  })

  test('should accept axios config as the 2nd arg in a list', async function () {
    mockApi.onAny().reply(200, { data: jsonWidget1 })
    const params = { filter: 'color' }

    await store.delete([normWidget1, { params: params }])

    expect(mockApi.history.delete[0].params).to.deep.equal(params)
  })

  test('should allow the endpoint url to be overridden in config', async function () {
    mockApi.onAny().reply(200, { data: jsonWidget1 })
    const url = '/fish/1'

    await store.delete([normWidget1, { url: url }])
    expect(mockApi.history.delete[0].url).to.equal(url)
  })

  test('should delete a record from the store', async function () {
    mockApi.onAny().reply(204)

    let deleteRecordMock = sinon.stub(store, 'deleteRecord')
    await store.delete(normWidget1)

    expect(deleteRecordMock).to.have.been.calledWith(normWidget1)
  })

  test('should delete a record (string) from the store', async function () {
    mockApi.onAny().reply(204)

    let deleteRecordMock = sinon.stub(store, 'deleteRecord')
    // Leading slash is incorrect syntax, but we should handle it so test with it in
    await store.delete('widget/1')

    expect(deleteRecordMock).to.have.been.calledWith('widget/1')
  })

  test('should return deleted object if passed back by server', async function () {
    mockApi.onAny().reply(200, { data: jsonWidget1 })

    // Leading slash is incorrect syntax, but we should handle it so test with it in
    let res = await store.delete(normWidget1)

    expect(res).to.deep.equal(normWidget1)
  })

  test('should handle API errors', async function () {
    mockApi.onAny().reply(500)

    try {
      await store.delete(normWidget1)
    } catch (error) {
      expect(error.response.status).to.equal(500)
    }
  })
})
