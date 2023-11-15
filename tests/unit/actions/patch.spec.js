import { beforeEach, describe, expect, test } from 'vitest'
import sinonChai from 'sinon-chai'
import sinon from 'sinon'
import chai from 'chai'
chai.use(sinonChai)

import { makeApi } from '../server'
let api, mockApi

import { utils } from '../../../src/jsonapi-vuex'
import createStubContext from '../stubs/context'
import createJsonapiModule from '../utils/createJsonapiModule'
import {
  jsonFormat as createJsonWidget1,
  jsonFormatPatch as createJsonWidget1Patch,
  normFormat as createNormWidget1,
  normFormatPatch as createNormWidget1Patch,
  normFormatUpdate as createNormWidget1Update,
  normFormatWithRels as createNormWidget1WithRels,
} from '../fixtures/widget1'

describe('patch', function () {
  let jsonWidget1, jsonWidget1Patch, normWidget1, normWidget1Patch, normWidget1Update, jsonapiModule, stubContext

  beforeEach(function () {
    [ api, mockApi ] = makeApi()
    jsonWidget1 = createJsonWidget1()
    jsonWidget1Patch = createJsonWidget1Patch()
    normWidget1 = createNormWidget1()
    normWidget1Patch = createNormWidget1Patch()
    normWidget1Update = createNormWidget1Update()

    jsonapiModule = createJsonapiModule(api)
    stubContext = createStubContext(jsonapiModule)
  })

  test('should make an api call to PATCH item(s)', async function () {
    mockApi.onAny().reply(200, { data: jsonWidget1 })

    await jsonapiModule.actions.patch(stubContext, normWidget1Patch)

    expect(mockApi.history.patch[0].url).to.equal(
      `${normWidget1Patch['_jv']['type']}/${normWidget1Patch['_jv']['id']}`
    )
  })

  test('should accept axios config as the 2nd arg in a list', async function () {
    mockApi.onAny().reply(200, { data: jsonWidget1 })
    const params = { filter: 'color' }

    await jsonapiModule.actions.patch(stubContext, [normWidget1Patch, { params: params }])

    expect(mockApi.history.patch[0].params).to.deep.equal(params)
  })

  test('should allow the endpoint url to be overridden in config', async function () {
    mockApi.onAny().reply(200, { data: jsonWidget1 })
    const url = '/fish/1'

    await jsonapiModule.actions.patch(stubContext, [normWidget1, { url: url }])
    expect(mockApi.history.patch[0].url).to.equal(url)
  })

  test('should delete then add record(s) in the store (from server response)', async function () {
    mockApi.onAny().reply(200, { data: jsonWidget1Patch })

    await jsonapiModule.actions.patch(stubContext, normWidget1Patch)

    expect(stubContext.commit).to.have.been.calledWith('deleteRecord', normWidget1Patch)
    expect(stubContext.commit).to.have.been.calledWith('addRecords', normWidget1Update)
  })

  test('should update record(s) in the store (no server response)', async function () {
    mockApi.onAny().reply(204)

    await jsonapiModule.actions.patch(stubContext, normWidget1Patch)

    expect(stubContext.commit).to.have.been.calledWith('mergeRecords', normWidget1Patch)
  })

  test('should update record(s) in the store (meta-only response)', async function () {
    mockApi.onAny().reply(200, { meta: 'testing' })

    await jsonapiModule.actions.patch(stubContext, normWidget1Patch)

    expect(stubContext.commit).to.have.been.calledWith('mergeRecords', normWidget1Patch)
  })

  test("should return data via the 'get' getter", async function () {
    mockApi.onAny().reply(204)

    await jsonapiModule.actions.patch(stubContext, normWidget1Patch)

    expect(stubContext.getters.get).to.have.been.calledWith(normWidget1Patch)
  })

  test('should preserve json in _jv in returned data', async function () {
    let jm = createJsonapiModule(api, { preserveJson: true })
    mockApi.onAny().reply(200, { data: jsonWidget1 })

    let res = await jm.actions.patch(stubContext, normWidget1Patch)

    // json should now be nested in _jv
    expect(res['_jv']).to.have.keys('json')
  })

  test('should handle API errors', async function () {
    mockApi.onAny().reply(500)

    try {
      await jsonapiModule.actions.patch(stubContext, normWidget1)
    } catch (error) {
      expect(error.response.status).to.equal(500)
    }
  })

  test('should not include rels/links/meta in requests (auto cleanPatch)', async function () {
    mockApi.onAny().reply(204)
    const widget = createNormWidget1WithRels()
    jsonapiModule = createJsonapiModule(api, {followRelationshipsData: true, cleanPatch: true }) //prettier-ignore
    await jsonapiModule.actions.patch(stubContext, widget)
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
    jsonapiModule = createJsonapiModule(api, conf) //prettier-ignore
    await jsonapiModule.actions.patch(stubContext, widget)
    const res = JSON.parse(mockApi.history.patch[0].data)
    expect(res.data).to.have.property('relationships')
    expect(res.data).to.have.property('links')
  })

  test('should not include rels/links/meta in requests (manual cleanPatch)', async function () {
    mockApi.onAny().reply(204)
    const widget = createNormWidget1WithRels()
    jsonapiModule = createJsonapiModule(api, {followRelationshipsData: true}) //prettier-ignore
    await jsonapiModule.actions.patch(stubContext, utils.cleanPatch(widget))
    const res = JSON.parse(mockApi.history.patch[0].data)
    expect(res.data).to.not.have.property('relationships')
    expect(res.data).to.not.have.property('links')
    expect(res.data).to.not.have.property('meta')
  })

  test('should include rels/links/meta in requests', async function () {
    mockApi.onAny().reply(204)
    const widget = createNormWidget1WithRels()
    jsonapiModule = createJsonapiModule(api, {followRelationshipsData: true}) //prettier-ignore
    const clean = utils.cleanPatch(widget, {}, ['links', 'meta', 'relationships']) //prettier-ignore
    await jsonapiModule.actions.patch(stubContext, clean)
    const res = JSON.parse(mockApi.history.patch[0].data)
    expect(res.data).to.have.property('relationships')
    expect(res.data).to.have.property('links')
  })
})
