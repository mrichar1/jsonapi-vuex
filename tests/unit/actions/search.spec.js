import { expect } from 'chai'

import createStubContext from '../stubs/context'
import createJsonapiModule from '../utils/createJsonapiModule'
import { jsonFormat as createJsonWidget1, normFormat as createNormWidget1 } from '../fixtures/widget1'
import {
  jsonFormat as createJsonRecord,
  normFormatWithRels as createNormRecordRels,
  storeFormat as createStoreRecord,
} from '../fixtures/record'
import { createResponseMeta } from '../fixtures/serverResponse'

describe('search', function() {
  let jsonWidget1,
    normWidget1,
    normWidget1Rels,
    normRecordRels,
    storeRecord,
    jsonRecord,
    meta,
    jsonapiModule,
    stubContext

  beforeEach(function() {
    jsonWidget1 = createJsonWidget1()
    normWidget1 = createNormWidget1()
    normRecordRels = createNormRecordRels()
    normWidget1Rels = normRecordRels[normWidget1['_jv']['id']]
    storeRecord = createStoreRecord()
    jsonRecord = createJsonRecord()
    meta = createResponseMeta()
    jsonapiModule = createJsonapiModule(this.api)
    stubContext = createStubContext(jsonapiModule)
  })

  it('should make an api call to GET item(s)', async function() {
    this.mockApi.onAny().reply(200, { data: jsonWidget1 })

    await jsonapiModule.actions.search(stubContext, normWidget1)

    expect(this.mockApi.history.get[0].url).to.equal(normWidget1['_jv']['links']['self'])
  })

  it('should make an api call to GET a collection', async function() {
    this.mockApi.onAny().reply(200, { data: jsonWidget1 })
    delete normWidget1['_jv']['id']
    delete normWidget1['_jv']['links']

    await jsonapiModule.actions.search(stubContext, normWidget1)

    expect(this.mockApi.history.get[0].url).to.equal(`${normWidget1['_jv']['type']}`)
  })

  it('should accept axios config as the 2nd arg in a list', async function() {
    this.mockApi.onAny().reply(200, { data: jsonWidget1 })
    const params = { filter: 'color' }

    await jsonapiModule.actions.search(stubContext, [normWidget1, { params: params }])
    expect(this.mockApi.history.get[0].params).to.deep.equal(params)
  })

  it('should allow the endpoint url to be overridden in config', async function() {
    this.mockApi.onAny().reply(200, { data: jsonWidget1 })
    const url = '/fish/1'

    await jsonapiModule.actions.search(stubContext, [normWidget1, { url: url }])
    expect(this.mockApi.history.get[0].url).to.equal(url)
  })

  it('should return normalized data', async function() {
    this.mockApi.onAny().reply(200, { data: jsonWidget1 })

    let res = await jsonapiModule.actions.search(stubContext, normWidget1)

    expect(res).to.deep.equal(normWidget1)
  })

  it('should return normalized data with expanded rels (single item)', async function() {
    const jm = createJsonapiModule(this.api, {
      followRelationshipsData: true,
    })
    // Make state contain all records for rels to work
    stubContext['state'] = storeRecord
    this.mockApi.onAny().reply(200, { data: jsonWidget1 })

    let res = await jm.actions.search(stubContext, normWidget1)

    expect(res).to.have.all.keys(normWidget1Rels)
  })

  it('should return normalized data with expanded rels (array)', async function() {
    const jm = createJsonapiModule(this.api, {
      followRelationshipsData: true,
    })
    // Make state contain all records for rels to work
    stubContext['state'] = storeRecord
    this.mockApi.onAny().reply(200, jsonRecord)

    let res = await jm.actions.search(stubContext, 'widget')

    // Check 'sub-key' equality for each item in the collection
    for (let [key, val] of Object.entries(res)) {
      expect(val).to.have.all.keys(normRecordRels[key])
    }
  })

  it("should handle an empty rels 'data' object", async function() {
    const jm = createJsonapiModule(this.api, {
      followRelationshipsData: true,
    })
    // Delete contents of data and remove links
    jsonWidget1['relationships']['widgets']['data'] = {}
    delete jsonWidget1['relationships']['widgets']['links']
    this.mockApi.onAny().reply(200, { data: jsonWidget1 })

    let res = await jm.actions.search(stubContext, normWidget1)

    expect(res['_jv']['rels']['widgets']).to.deep.equal({})
  })

  it('should preserve json in _jv in returned data', async function() {
    const jm = createJsonapiModule(this.api, { preserveJson: true })
    // Mock server to only return a meta section
    this.mockApi.onAny().reply(200, meta)

    let res = await jm.actions.search(stubContext, 'widget')

    // json should now be nested in _jv/json
    expect(res['_jv']['json']).to.deep.equal(meta)
  })

  it('should not preserve json in _jv in returned data', async function() {
    const jm = createJsonapiModule(this.api, { preserveJson: false })
    // Mock server to only return a meta section
    this.mockApi.onAny().reply(200, meta)

    let res = await jm.actions.search(stubContext, 'widget')

    // collections should have no top-level _jv
    expect(res).to.not.have.key('_jv')
  })

  it('should handle API errors', async function() {
    this.mockApi.onAny().reply(500)

    try {
      await jsonapiModule.actions.search(stubContext, normWidget1)
    } catch (error) {
      expect(error.response.status).to.equal(500)
    }
  })
})
