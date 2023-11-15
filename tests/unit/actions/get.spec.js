import { beforeEach, describe, expect, test } from 'vitest'
import sinonChai from 'sinon-chai'
import chai from 'chai'
chai.use(sinonChai)

import { makeApi } from '../server'
let api, mockApi

import { config } from '../../../src/jsonapi-vuex'
import createStubContext from '../stubs/context'
import createJsonapiModule from '../utils/createJsonapiModule'
import { jsonFormat as createJsonWidget1, normFormat as createNormWidget1 } from '../fixtures/widget1'
import { jsonFormat as createJsonWidget2, normFormat as createNormWidget2 } from '../fixtures/widget2'
import { jsonFormat as createJsonMachine1, normFormat as createNormMachine1 } from '../fixtures/machine1'
import {
  jsonFormat as createJsonRecord,
  normFormatWithRels as createNormRecordRels,
  storeFormat as createStoreRecord,
} from '../fixtures/record'
import { createResponseMeta } from '../fixtures/serverResponse'

describe('get', function () {
  let jsonMachine1,
    normMachine1,
    jsonWidget1,
    jsonWidget2,
    normWidget1,
    normWidget1Rels,
    normWidget2,
    normRecordRels,
    storeRecord,
    jsonRecord,
    meta,
    jsonapiModule,
    stubContext

  beforeEach(function () {
    // Mock up a fake axios-like api instance
    ;[api, mockApi] = makeApi()
    jsonMachine1 = createJsonMachine1()
    normMachine1 = createNormMachine1()
    jsonWidget1 = createJsonWidget1()
    jsonWidget2 = createJsonWidget2()
    normWidget1 = createNormWidget1()
    normWidget2 = createNormWidget2()
    normRecordRels = createNormRecordRels()
    normWidget1Rels = normRecordRels[normWidget1['_jv']['id']]
    storeRecord = createStoreRecord()
    jsonRecord = createJsonRecord()
    meta = createResponseMeta()
    jsonapiModule = createJsonapiModule(api)
    stubContext = createStubContext(jsonapiModule)
  })

  test('should make an api call to GET item(s)', async function () {
    mockApi.onAny().reply(200, { data: jsonWidget1 })

    await jsonapiModule.actions.get(stubContext, normWidget1)

    expect(mockApi.history.get[0].url).to.equal(normWidget1['_jv']['links']['self'])
  })

  test('should make an api call to GET a collection', async function () {
    mockApi.onAny().reply(200, { data: jsonWidget1 })
    delete normWidget1['_jv']['id']
    delete normWidget1['_jv']['links']

    await jsonapiModule.actions.get(stubContext, normWidget1)
    expect(mockApi.history.get[0].url).to.equal(`${normWidget1['_jv']['type']}`)
  })

  test('should accept axios config as the 2nd arg in a list', async function () {
    mockApi.onAny().reply(200, { data: jsonWidget1 })
    const params = { filter: 'color' }

    await jsonapiModule.actions.get(stubContext, [normWidget1, { params: params }])
    expect(mockApi.history.get[0].params).to.deep.equal(params)
  })

  test('should allow the endpoint url to be overridden in config', async function () {
    mockApi.onAny().reply(200, { data: jsonWidget1 })
    const url = '/fish/1'

    await jsonapiModule.actions.get(stubContext, [normWidget1, { url: url }])
    expect(mockApi.history.get[0].url).to.equal(url)
  })

  test('should add record(s) in the store', async function () {
    mockApi.onAny().reply(200, { data: jsonWidget1 })

    await jsonapiModule.actions.get(stubContext, normWidget1)

    expect(stubContext.commit).to.have.been.calledWith('addRecords', normWidget1)
  })

  test('should add record(s) (string) in the store', async function () {
    mockApi.onAny().reply(200, { data: jsonWidget1 })

    // Leading slash is incorrect syntax, but we should handle it so test with it in
    await jsonapiModule.actions.get(stubContext, 'widget/1')

    expect(stubContext.commit).to.have.been.calledWith('addRecords', normWidget1)
  })

  test('should return normalized data', async function () {
    mockApi.onAny().reply(200, { data: jsonWidget1 })

    let res = await jsonapiModule.actions.get(stubContext, normWidget1)

    expect(res).to.deep.equal(normWidget1)
  })

  test('should add included record(s) to the store', async function () {
    // included array can include objects from different collections
    const data = {
      data: jsonWidget1,
      included: [jsonWidget2, jsonMachine1],
    }
    mockApi.onAny().reply(200, data)

    // for a real API call, would need axios include params here
    await jsonapiModule.actions.get(stubContext, normWidget1)

    // Add isIncluded, remove isData (As would be found in 'real' response)
    normWidget2._jv.isIncluded = true
    normMachine1._jv.isIncluded = true
    delete normWidget2._jv.isData
    delete normMachine1._jv.isData
    expect(stubContext.commit).to.have.been.calledWith('mergeRecords', [normWidget2, normMachine1])
  })

  test('should return normalized data with expanded rels (single item)', async function () {
    const jm = createJsonapiModule(api, {
      followRelationshipsData: true,
    })
    // Make state contain all records for rels to work
    stubContext['state'] = storeRecord
    mockApi.onAny().reply(200, { data: jsonWidget1 })

    let res = await jm.actions.get(stubContext, normWidget1)

    expect(res).to.have.all.keys(normWidget1Rels)
  })

  test('should return normalized data with expanded rels (array)', async function () {
    const jm = createJsonapiModule(api, {
      followRelationshipsData: true,
    })
    // Make state contain all records for rels to work
    stubContext['state'] = storeRecord
    mockApi.onAny().reply(200, jsonRecord)

    let res = await jm.actions.get(stubContext, 'widget')

    // Check 'sub-key' equality for each item in the collection
    for (let [key, val] of Object.entries(res)) {
      expect(val).to.have.all.keys(normRecordRels[key])
    }
  })

  test("should handle an empty rels 'data' object", async function () {
    const jm = createJsonapiModule(api, {
      followRelationshipsData: true,
    })
    // Delete contents of data and remove links
    jsonWidget1['relationships']['widgets']['data'] = {}
    delete jsonWidget1['relationships']['widgets']['links']
    mockApi.onAny().reply(200, { data: jsonWidget1 })

    let res = await jm.actions.get(stubContext, normWidget1)

    expect(res['_jv']['rels']['widgets']).to.deep.equal({})
  })

  test('should preserve json in _jv in returned data', async function () {
    const jm = createJsonapiModule(api, { preserveJson: true })
    // Mock server to only return a meta section
    mockApi.onAny().reply(200, meta)

    let res = await jm.actions.get(stubContext, 'widget')

    // json should now be nested in _jv/json
    expect(res['_jv']['json']).to.deep.equal(meta)
  })

  test('should not preserve json in _jv in returned data', async function () {
    const jm = createJsonapiModule(api, { preserveJson: false })
    // Mock server to only return a meta section
    mockApi.onAny().reply(200, meta)

    let res = await jm.actions.get(stubContext, 'widget')

    // collections should have no top-level _jv
    expect(res).to.not.have.key('_jv')
  })

  test('should call clearRecords if clearOnUpdate is set for collections', async function () {
    mockApi.onAny().reply(200, { data: [] })

    config.clearOnUpdate = true

    await jsonapiModule.actions.get(stubContext, '/widgets')
    expect(stubContext.commit).to.have.been.calledWith('clearRecords')
  })

  test('should not call clearRecords if clearOnUpdate is set for items', async function () {
    mockApi.onAny().reply(200, { data: jsonWidget1 })

    config.clearOnUpdate = true

    await jsonapiModule.actions.get(stubContext, normWidget1)
    expect(stubContext.commit).to.not.have.been.calledWith('clearRecords')
  })

  test('should call clearRecords with endpoint if clearOnUpdate is set and no data', async function () {
    mockApi.onAny().reply(200, { data: [] })

    config.clearOnUpdate = true

    let endpoint = 'MyEndpoint'
    await jsonapiModule.actions.get(stubContext, endpoint)
    expect(stubContext.commit).to.have.been.calledWith('clearRecords', { _jv: { type: endpoint } })
  })

  test('should handle API errors', async function () {
    mockApi.onAny().reply(500)

    try {
      await jsonapiModule.actions.get(stubContext, normWidget1)
    } catch (error) {
      expect(error.response.status).to.equal(500)
    }
  })
})
