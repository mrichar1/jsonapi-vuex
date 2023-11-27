import { beforeEach, describe, expect, test } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { makeApi } from '../server'
let api, mockApi

import defaultJsonapiStore from '../utils/defaultJsonapiStore'
import { jsonFormat as createJsonWidget1, normFormat as createNormWidget1 } from '../fixtures/widget1'

describe('patchRelated', function () {
  let normWidget1, jsonWidget1, store

  beforeEach(function () {
    ;[api, mockApi] = makeApi()
    normWidget1 = createNormWidget1()
    jsonWidget1 = createJsonWidget1()

    setActivePinia(createPinia())
    let { jsonapiStore } = defaultJsonapiStore(api)
    store = jsonapiStore()

  })

  test('Should throw an error if passed an object with no type or id', async function () {
    try {
      await store.patchRelated({ _jv: {} })
      throw 'Should have thrown an error (no id)'
    } catch (error) {
      expect(error).to.equal('No type/id specified')
    }
  })

  test('Should throw an error if passed an object with no relationships', async function () {
    try {
      await store.patchRelated({ _jv: { type: 'widget', id: 1 } })
      throw 'Should have thrown an error (no relationships)'
    } catch (error) {
      expect(error).to.equal('No relationships specified')
    }
  })

  test('should make a patch request for the object passed in.', async function () {
    mockApi.onPatch().replyOnce(204)
    mockApi.onGet().replyOnce(200, { data: jsonWidget1 })

    const rel = { data: { type: 'widget', id: '2' } }
    normWidget1['_jv']['relationships'] = { widgets: rel }

    await store.patchRelated(normWidget1)
    // Expect a patch call to rel url, with rel payload, then get object to update store
    expect(mockApi.history.patch[0].url).to.equal('widget/1/relationships/widgets')
    expect(mockApi.history.patch[0].data).to.deep.equal(JSON.stringify(rel))
    expect(mockApi.history.get[0].params).to.have.property('include')
    expect(mockApi.history.get[0].url).to.equal('widget/1')
  })

  test('should make a patch request without includes.', async function () {
    let { jsonapiStore } = defaultJsonapiStore(api, { relatedIncludes: false }, 'tmp')
    store = jsonapiStore()
    mockApi.onPatch().replyOnce(204)
    mockApi.onGet().replyOnce(200, { data: jsonWidget1 })

    const rel = { data: { type: 'widget', id: '2' } }
    normWidget1['_jv']['relationships'] = { widgets: rel }

    await store.patchRelated(normWidget1)
    // Expect a patch call to rel url, with rel payload, then get object to update store
    expect(mockApi.history.patch[0].url).to.equal('widget/1/relationships/widgets')
    expect(mockApi.history.patch[0].data).to.deep.equal(JSON.stringify(rel))
    expect(mockApi.history.get[0].params).to.not.have.property('include')
    expect(mockApi.history.get[0].url).to.equal('widget/1')
  })

  test('should handle multiple relationships', async function () {
    mockApi.onPatch().reply(204)
    mockApi.onGet().replyOnce(200, { data: jsonWidget1 })

    const rel1 = { data: { type: 'widget', id: '2' } }
    const rel2 = { data: { type: 'doohickey', id: '3' } }
    normWidget1['_jv']['relationships'] = { widgets: rel1, doohickeys: rel2 }

    await store.patchRelated(normWidget1)
    expect(mockApi.history.patch[0].url).to.equal('widget/1/relationships/widgets')
    expect(mockApi.history.patch[0].data).to.deep.equal(JSON.stringify(rel1))
    expect(mockApi.history.patch[1].url).to.equal('widget/1/relationships/doohickeys')
    expect(mockApi.history.patch[1].data).to.deep.equal(JSON.stringify(rel2))
    expect(mockApi.history.get[0].params).to.have.property('include')
    expect(mockApi.history.get[0].url).to.equal('widget/1')
    // Only get the object once at end
    expect(mockApi.history.get.length).to.equal(1)
  })

  test('Should handle API errors (in the data)', async function () {
    mockApi.onPatch().reply(500)

    const rel = { data: { type: 'widget', id: '2' } }
    normWidget1['_jv']['relationships'] = { widgets: rel }

    try {
      await store.patchRelated(normWidget1)
    } catch (error) {
      expect(error.response.status).to.equal(500)
    }
  })
})
