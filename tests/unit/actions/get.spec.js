import { expect } from 'chai'

import createStubContext from '../stubs/context'
import createJsonapiModule from '../utils/createJsonapiModule'
import {
  jsonFormat as createJsonWidget1,
  normFormat as createNormWidget1,
} from '../fixtures/widget1'
import {
  jsonFormat as createJsonWidget2,
  normFormat as createNormWidget2,
} from '../fixtures/widget2'
import {
  jsonFormat as createJsonMachine1,
  normFormat as createNormMachine1,
} from '../fixtures/machine1'
import {
  jsonFormat as createJsonRecord,
  normFormatWithRels as createNormRecordRels,
  storeFormat as createStoreRecord,
} from '../fixtures/record'
import { createResponseMeta } from '../fixtures/serverResponse'

describe('get', function() {
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

  beforeEach(function() {
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
    jsonapiModule = createJsonapiModule(this.api)
    stubContext = createStubContext(jsonapiModule)
  })

  it('should make an api call to GET item(s)', async function() {
    this.mockApi.onAny().reply(200, { data: jsonWidget1 })

    await jsonapiModule.actions.get(stubContext, normWidget1)

    expect(this.mockApi.history.get[0].url).to.equal(
      `/${normWidget1['_jv']['type']}/${normWidget1['_jv']['id']}`
    )
  })

  it('should make an api call to GET a collection', async function() {
    this.mockApi.onAny().reply(200, { data: jsonWidget1 })
    delete normWidget1['_jv']['id']

    await jsonapiModule.actions.get(stubContext, normWidget1)

    expect(this.mockApi.history.get[0].url).to.equal(
      `/${normWidget1['_jv']['type']}`
    )
  })

  it('should accept axios config as the 2nd arg in a list', async function() {
    this.mockApi.onAny().reply(200, { data: jsonWidget1 })
    const params = { filter: 'color' }

    await jsonapiModule.actions.get(stubContext, [
      normWidget1,
      { params: params },
    ])

    expect(this.mockApi.history.get[0].params).to.equal(params)
  })

  it('should add record(s) in the store', async function() {
    this.mockApi.onAny().reply(200, { data: jsonWidget1 })

    await jsonapiModule.actions.get(stubContext, normWidget1)

    expect(stubContext.commit).to.have.been.calledWith(
      'modifyRecords',
      normWidget1
    )
  })

  it('should add record(s) (string) in the store', async function() {
    this.mockApi.onAny().reply(200, { data: jsonWidget1 })

    // Leading slash is incorrect syntax, but we should handle it so test with it in
    await jsonapiModule.actions.get(stubContext, 'widget/1')

    expect(stubContext.commit).to.have.been.calledWith(
      'modifyRecords',
      normWidget1
    )
  })

  it('should return normalized data', async function() {
    this.mockApi.onAny().reply(200, { data: jsonWidget1 })

    let res = await jsonapiModule.actions.get(stubContext, normWidget1)

    expect(res).to.deep.equal(normWidget1)
  })

  it('should add included record(s) to the store', async function() {
    // included array can include objects from different collections
    const data = {
      data: jsonWidget1,
      included: [jsonWidget2, jsonMachine1],
    }
    this.mockApi.onAny().reply(200, data)

    // for a real API call, would need axios include params here
    await jsonapiModule.actions.get(stubContext, normWidget1)

    expect(stubContext.commit).to.have.been.calledWith(
      'modifyRecords',
      normWidget2
    )
    expect(stubContext.commit).to.have.been.calledWith(
      'modifyRecords',
      normMachine1
    )
  })

  it('should return normalized data with expanded rels (single item)', async function() {
    const jm = createJsonapiModule(this.api, {
      followRelationshipsData: true,
    })
    // Make state contain all records for rels to work
    stubContext['state'] = storeRecord
    this.mockApi.onAny().reply(200, { data: jsonWidget1 })

    let res = await jm.actions.get(stubContext, normWidget1)

    expect(res).to.have.all.keys(normWidget1Rels)
  })

  it('should return normalized data with expanded rels (array)', async function() {
    const jm = createJsonapiModule(this.api, {
      followRelationshipsData: true,
    })
    // Make state contain all records for rels to work
    stubContext['state'] = storeRecord
    this.mockApi.onAny().reply(200, jsonRecord)

    let res = await jm.actions.get(stubContext, 'widget')

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

    let res = await jm.actions.get(stubContext, normWidget1)

    expect(res['_jv']['rels']['widgets']).to.deep.equal({})
  })

  it('should preserve json in _jv in returned data', async function() {
    const jm = createJsonapiModule(this.api, { preserveJson: true })
    // Mock server to only return a meta section
    this.mockApi.onAny().reply(200, meta)

    let res = await jm.actions.get(stubContext, 'widget')

    // json should now be nested in _jv/json
    expect(res['_jv']['json']).to.deep.equal(meta)
  })

  it('should not preserve json in _jv in returned data', async function() {
    const jm = createJsonapiModule(this.api, { preserveJson: false })
    // Mock server to only return a meta section
    this.mockApi.onAny().reply(200, meta)

    let res = await jm.actions.get(stubContext, 'widget')

    // collections should have no top-level _jv
    expect(res).to.not.have.key('_jv')
  })

  it('should handle API errors', async function() {
    this.mockApi.onAny().reply(500)

    try {
      await jsonapiModule.actions.get(stubContext, normWidget1)
    } catch (error) {
      expect(error.response.status).to.equal(500)
    }
  })
})
