import { beforeEach, describe, expect, test } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { makeApi } from '../server'
let api, mockApi

import { createJsonapiStore } from '../../../src/jsonapi-vuex'
import defaultJsonapiStore from '../utils/defaultJsonapiStore'
import { jsonFormat as createJsonWidget1, normFormat as createNormWidget1 } from '../fixtures/widget1'
import {
  jsonFormat as createJsonRecord,
  normFormatWithRels as createNormRecordRels,
  storeFormat as createStoreRecord,
} from '../fixtures/record'
import { createResponseMeta } from '../fixtures/serverResponse'

describe('search', function () {
  let jsonWidget1,
    normWidget1,
    normWidget1Rels,
    normRecordRels,
    storeRecord,
    jsonRecord,
    meta,
    store,
    config,
    status,
    utils

  beforeEach(function () {
    ;[api, mockApi] = makeApi()
    jsonWidget1 = createJsonWidget1()
    normWidget1 = createNormWidget1()
    normRecordRels = createNormRecordRels()
    normWidget1Rels = normRecordRels[normWidget1['_jv']['id']]
    storeRecord = createStoreRecord()
    jsonRecord = createJsonRecord()
    meta = createResponseMeta()
    setActivePinia(createPinia())
    let jStore = defaultJsonapiStore(api)
    store = jStore.jsonapiStore()
    config = jStore.config
    status = jStore.stats
    utils = jStore.utils
  })

  test('should make an api call to GET item(s)', async function () {
    mockApi.onAny().reply(200, { data: jsonWidget1 })

    await store.search(normWidget1)

    expect(mockApi.history.get[0].url).to.equal(normWidget1['_jv']['links']['self'])
  })

  test('should make an api call to GET a collection', async function () {
    mockApi.onAny().reply(200, { data: jsonWidget1 })
    delete normWidget1['_jv']['id']
    delete normWidget1['_jv']['links']

    await store.search(normWidget1)

    expect(mockApi.history.get[0].url).to.equal(`${normWidget1['_jv']['type']}`)
  })

  test('should accept axios config as the 2nd arg in a list', async function () {
    mockApi.onAny().reply(200, { data: jsonWidget1 })
    const params = { filter: 'color' }

    await store.search([normWidget1, { params: params }])
    expect(mockApi.history.get[0].params).to.deep.equal(params)
  })

  test('should allow the endpoint url to be overridden in config', async function () {
    mockApi.onAny().reply(200, { data: jsonWidget1 })
    const url = '/fish/1'

    await store.search([normWidget1, { url: url }])
    expect(mockApi.history.get[0].url).to.equal(url)
  })

  test('should return normalized data', async function () {
    mockApi.onAny().reply(200, { data: jsonWidget1 })

    let res = await store.search(normWidget1)

    expect(res).to.deep.equal(normWidget1)
  })

  test('should return normalized data with expanded rels (single item)', async function () {
    const { jsonapiStore} = createJsonapiStore(api, {
      followRelationshipsData: true,
    }, 'tmp')
    store = jsonapiStore()
    // Make state contain all records for rels to work
    mockApi.onAny().reply(200, { data: jsonWidget1 })

    let res = await store.search(normWidget1)

    expect(res).to.have.all.keys(normWidget1Rels)
  })

  test('should return normalized data with expanded rels (array)', async function () {
    const { jsonapiStore } = createJsonapiStore(api, {
      followRelationshipsData: true,
    }, 'tmp')
    store = jsonapiStore()
    // Make state contain all records for rels to work
    mockApi.onAny().reply(200, jsonRecord)

    let res = await store.search('widget')

    // Check 'sub-key' equality for each item in the collection
    for (let [key, val] of Object.entries(res)) {
      expect(val).to.have.all.keys(normRecordRels[key])
    }
  })

  test("should handle an empty rels 'data' object", async function () {
    const { jsonapiStore } = createJsonapiStore(api, {
      followRelationshipsData: true,
    }, 'tmp')
    store = jsonapiStore()
    // Delete contents of data and remove links
    jsonWidget1['relationships']['widgets']['data'] = {}
    delete jsonWidget1['relationships']['widgets']['links']
    mockApi.onAny().reply(200, { data: jsonWidget1 })

    let res = await store.search(normWidget1)

    expect(res['_jv']['rels']['widgets']).to.deep.equal({})
  })

  test('should preserve json in _jv in returned data', async function () {
    const { jsonapiStore } = createJsonapiStore(api, { preserveJson: true }, 'tmp')
    store = jsonapiStore()
    // Mock server to only return a meta section
    mockApi.onAny().reply(200, meta)

    let res = await store.search('widget')

    // json should now be nested in _jv/json
    expect(res['_jv']['json']).to.deep.equal(meta)
  })

  test('should not preserve json in _jv in returned data', async function () {
    const { jsonapiStore } = createJsonapiStore(api, { preserveJson: false }, 'tmp')
    store = jsonapiStore()
    // Mock server to only return a meta section
    mockApi.onAny().reply(200, meta)

    let res = await store.search('widget')

    // collections should have no top-level _jv
    expect(res).to.not.have.key('_jv')
  })

  test('should handle API errors', async function () {
    mockApi.onAny().reply(500)

    try {
      await store.search(normWidget1)
    } catch (error) {
      expect(error.response.status).to.equal(500)
    }
  })
})
