import { beforeEach, describe, expect, test } from 'vitest'
import sinonChai from 'sinon-chai'
import chai from 'chai'
import sinon  from 'sinon'
chai.use(sinonChai)

import { setActivePinia, createPinia } from 'pinia'
import { makeApi } from '../server'
let api, mockApi

import { createJsonapiStore } from '../../../src/jsonapi-vuex'
import defaultJsonapiStore from '../utils/defaultJsonapiStore'
import {
  jsonFormat as createJsonWidget1,
  jsonFormatPatch as createJsonWidget1Patch,
  normFormat as createNormWidget1,
  normFormatPatch as createNormWidget1Patch,
  normFormatUpdate as createNormWidget1Update,
  normFormatWithRels as createNormWidget1WithRels,
} from '../fixtures/widget1'

describe('patch', function () {
  let jsonWidget1, jsonWidget1Patch, normWidget1, normWidget1Patch, normWidget1Update, store, config, status, utils

  beforeEach(function () {
    ;[api, mockApi] = makeApi()
    jsonWidget1 = createJsonWidget1()
    jsonWidget1Patch = createJsonWidget1Patch()
    normWidget1 = createNormWidget1()
    normWidget1Patch = createNormWidget1Patch()
    normWidget1Update = createNormWidget1Update()

    setActivePinia(createPinia())
    let jStore = defaultJsonapiStore(api)
    store = jStore.jsonapiStore()
    config = jStore.config
    status = jStore.stats
    utils = jStore.utils
  })

  test('should make an api call to PATCH item(s)', async function () {
    mockApi.onAny().reply(200, { data: jsonWidget1 })

    await store.patch(normWidget1Patch)

    expect(mockApi.history.patch[0].url).to.equal(`${normWidget1Patch['_jv']['type']}/${normWidget1Patch['_jv']['id']}`)
  })

  test('should accept axios config as the 2nd arg in a list', async function () {
    mockApi.onAny().reply(200, { data: jsonWidget1 })
    const params = { filter: 'color' }

    await store.patch([normWidget1Patch, { params: params }])

    expect(mockApi.history.patch[0].params).to.deep.equal(params)
  })

  test('should allow the endpoint url to be overridden in config', async function () {
    mockApi.onAny().reply(200, { data: jsonWidget1 })
    const url = '/fish/1'

    await store.patch([normWidget1, { url: url }])
    expect(mockApi.history.patch[0].url).to.equal(url)
  })

  test('should delete then add record(s) in the store (from server response)', async function () {
    mockApi.onAny().reply(200, { data: jsonWidget1Patch })

    let deleteRecordMock = sinon.stub(store, 'deleteRecord')
    let addRecordsMock = sinon.stub(store, 'addRecords')
    await store.patch(normWidget1Patch)

    expect(deleteRecordMock).to.have.been.calledWith(normWidget1Patch)
    expect(addRecordsMock).to.have.been.calledWith(normWidget1Update)
  })

  test('should update record(s) in the store (no server response)', async function () {
    mockApi.onAny().reply(204)

    let mergeRecordsMock = sinon.stub(store, 'mergeRecords')
    await store.patch(normWidget1Patch)

    expect(mergeRecordsMock).to.have.been.calledWith(normWidget1Patch)
  })

  test('should update record(s) in the store (meta-only response)', async function () {
    mockApi.onAny().reply(200, { meta: 'testing' })

    let mergeRecordsMock = sinon.stub(store, 'mergeRecords')
    await store.patch(normWidget1Patch)

    expect(mergeRecordsMock).to.have.been.calledWith(normWidget1Patch)
  })

// FIXME: It is currently not possible to mock/stub a getter so this test is impossible
// See e.g.: https://github.com/vuejs/pinia/issues/945
  test.skip("should return data via the 'get' getter", async function () {
    mockApi.onAny().reply(204)

    await store.patch(normWidget1Patch)

    expect(store.getData).to.have.been.calledWith(normWidget1Patch)
  })

  test('should preserve json in _jv in returned data', async function () {
    mockApi.onAny().reply(200, { data: jsonWidget1 })
    let { jsonapiStore } = createJsonapiStore(api, { preserveJson: true }, 'tmp')
    store = jsonapiStore()

    let res = await store.patch(normWidget1Patch)

    // json should now be nested in _jv
    expect(res['_jv']).to.include.keys('json')
  })

  test('should handle API errors', async function () {
    mockApi.onAny().reply(500)

    try {
      await store.patch(normWidget1)
    } catch (error) {
      expect(error.response.status).to.equal(500)
    }
  })

  test('should not include rels/links/meta in requests (auto cleanPatch)', async function () {
    mockApi.onAny().reply(204)
    const widget = createNormWidget1WithRels()
    let { jsonapiStore } = createJsonapiStore(api, {followRelationshipsData: true, cleanPatch: true }, 'tmp')
    store = jsonapiStore()

    await store.patch(widget)
    const res = JSON.parse(mockApi.history.patch[0].data)
    expect(res.data).to.not.have.property('relationships')
    expect(res.data).to.not.have.property('links')
    expect(res.data).to.not.have.property('meta')
  })

  test('should include rels/links/meta in requests (auto cleanPatch)', async function () {
    mockApi.onAny().reply(204)
    const widget = createNormWidget1WithRels()
    const conf = {
      followRelationshipsData: true,
      cleanPatch: true,
      cleanPatchProps: ['links', 'relationships'],
    }
    let { jsonapiStore } = createJsonapiStore(api, conf, 'tmp')
    store = jsonapiStore()

    await store.patch(widget)
    const res = JSON.parse(mockApi.history.patch[0].data)
    expect(res.data).to.have.property('relationships')
    expect(res.data).to.have.property('links')
  })

  test('should not include rels/links/meta in requests (manual cleanPatch)', async function () {
    mockApi.onAny().reply(204)
    const widget = createNormWidget1WithRels()
    let  { jsonapiStore} = createJsonapiStore(api,  {followRelationshipsData: true}, 'tmp')
    store = jsonapiStore()

    await store.patch(utils.cleanPatch(widget))
    const res = JSON.parse(mockApi.history.patch[0].data)
    expect(res.data).to.not.have.property('relationships')
    expect(res.data).to.not.have.property('links')
    expect(res.data).to.not.have.property('meta')
  })

  test('should include rels/links/meta in requests', async function () {
    mockApi.onAny().reply(204)
    const widget = createNormWidget1WithRels()
    let { jsonapiStore } = createJsonapiStore(api,  {followRelationshipsData: true}, 'tmp')
    store = jsonapiStore()
    const clean = utils.cleanPatch(widget, {}, ['links', 'meta', 'relationships']) //prettier-ignore
    await store.patch(clean)
    const res = JSON.parse(mockApi.history.patch[0].data)
    expect(res.data).to.have.property('relationships')
    expect(res.data).to.have.property('links')
  })
})
