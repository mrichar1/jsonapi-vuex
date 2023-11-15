import { beforeEach, describe, expect, test } from 'vitest'
import { makeApi } from '../server'
let api, mockApi

import createStubContext from '../stubs/context'
import createJsonapiModule from '../utils/createJsonapiModule'
import {
  jsonFormat as createJsonWidget1,
  normFormat as createNormWidget1,
  storeFormat as createStoreWidget1,
} from '../fixtures/widget1'
import { jsonFormat as createJsonWidget2, storeFormat as createStoreWidget2 } from '../fixtures/widget2'
import { jsonFormat as createJsonWidget3, normFormat as createNormWidget3 } from '../fixtures/widget3'

describe('getRelated', function () {
  let jsonWidget1,
    jsonWidget2,
    jsonWidget3,
    normWidget1,
    storeWidget1,
    storeWidget2,
    storeWidget1_3, // eslint-disable-line camelcase
    jsonapiModule,
    stubContext

  beforeEach(function () {
    ;[api, mockApi] = makeApi()
    jsonWidget1 = createJsonWidget1()
    jsonWidget2 = createJsonWidget2()
    jsonWidget3 = createJsonWidget3()

    normWidget1 = createNormWidget1()

    storeWidget1 = createStoreWidget1()
    storeWidget2 = createStoreWidget2()
    // eslint-disable-next-line camelcase
    storeWidget1_3 = {
      widget: {
        1: createNormWidget1(),
        3: createNormWidget3(),
      },
    }

    jsonapiModule = createJsonapiModule(api)
    stubContext = createStubContext(jsonapiModule)
  })

  test('Should throw an error if passed an object with no type or id', async function () {
    try {
      await jsonapiModule.actions.getRelated(stubContext, { _jv: {} })
      throw 'Should have thrown an error (no id)'
    } catch (error) {
      expect(error).to.equal('No type/id specified')
    }
  })

  test('should use existing rel info in the object passed in.', async function () {
    // Only return related record (no initial object GET)
    mockApi.onGet().reply(200, { data: jsonWidget2 })

    const rel = { widgets: { data: { type: 'widget', id: 2 } } }

    normWidget1['_jv']['relationships'] = rel

    const res = await jsonapiModule.actions.getRelated(stubContext, normWidget1)

    expect(res).to.deep.equal({ widgets: storeWidget2 })
  })

  test('should use existing rel info in the object passed in - keys only.', async function () {
    // Return resource linkage, then related record
    mockApi
      .onGet()
      .replyOnce(200, { data: { type: 'widget', id: 2 } })
      .onGet()
      .replyOnce(200, { data: jsonWidget2 })

    const rel = { widgets: undefined }

    normWidget1['_jv']['relationships'] = rel

    const res = await jsonapiModule.actions.getRelated(stubContext, normWidget1)

    expect(res).to.deep.equal({ widgets: storeWidget2 })
  })

  test('should throw an error fetching resource linkage for unknown relationship.', async function () {
    // Return 404 - no such resource linkage
    mockApi.onGet().replyOnce(404)

    const rel = { invalidRelName: undefined }

    normWidget1['_jv']['relationships'] = rel

    try {
      await jsonapiModule.actions.getRelated(stubContext, normWidget1)
      throw 'should have thrown an error (invalidRelName)'
    } catch (error) {
      expect(error).to.equal('No such relationship: invalidRelName')
    }
  })

  test("should get a record's single related item (using 'data') - string", async function () {
    mockApi.onGet().replyOnce(200, { data: jsonWidget1 }).onGet().replyOnce(200, { data: jsonWidget2 })

    let res = await jsonapiModule.actions.getRelated(stubContext, 'widget/1')

    expect(res).to.deep.equal({ widgets: storeWidget2 })
  })

  test("should get a record's single related item (using 'data') - object", async function () {
    mockApi.onGet().replyOnce(200, { data: jsonWidget1 }).onGet().replyOnce(200, { data: jsonWidget2 })

    delete normWidget1['_jv']['relationships']

    let res = await jsonapiModule.actions.getRelated(stubContext, normWidget1)

    expect(res).to.deep.equal({ widgets: storeWidget2 })
  })

  test("should get a record's related items (using 'data')", async function () {
    // Return main item, then its related items
    mockApi
      .onGet()
      .replyOnce(200, { data: jsonWidget2 })
      .onGet()
      .replyOnce(200, { data: jsonWidget1 })
      .onGet()
      .replyOnce(200, { data: jsonWidget3 })

    let res = await jsonapiModule.actions.getRelated(stubContext, 'widget/2')

    expect(res).to.deep.equal({ widgets: storeWidget1_3 }) // eslint-disable-line camelcase
  })

  test("should get a record's related items (using 'links' string)", async function () {
    // Remove data so it will fallback to using links
    delete jsonWidget1['relationships']['widgets']['data']
    mockApi.onGet().replyOnce(200, { data: jsonWidget1 }).onGet().replyOnce(200, { data: jsonWidget2 })

    let res = await jsonapiModule.actions.getRelated(stubContext, 'widget/1')

    expect(res).to.deep.equal({ widgets: storeWidget2 })
  })

  test("should get a record's related items (using 'links' object)", async function () {
    // Remove data so it will fallback to using links
    delete jsonWidget1['relationships']['widgets']['data']
    // Replace links string with links object
    jsonWidget1['relationships']['widgets']['links']['related'] = {
      href: '/widget/1/widgets',
    }
    mockApi.onGet().replyOnce(200, { data: jsonWidget1 }).onGet().replyOnce(200, { data: jsonWidget2 })

    let res = await jsonapiModule.actions.getRelated(stubContext, 'widget/1')

    expect(res).to.deep.equal({ widgets: storeWidget2 })
  })

  test("should get a record's related items (string path)", async function () {
    mockApi
      .onGet()
      .replyOnce(200, { data: jsonWidget2 })
      .onGet()
      .replyOnce(200, { data: jsonWidget1 })
      .onGet()
      .replyOnce(200, { data: jsonWidget3 })

    let res = await jsonapiModule.actions.getRelated(stubContext, 'widget/2')

    expect(res).to.deep.equal({ widgets: storeWidget1_3 }) // eslint-disable-line camelcase
  })

  test('should return related data for a specific relname', async function () {
    mockApi.onGet().replyOnce(200, { data: jsonWidget3 }).onGet().replyOnce(200, { data: jsonWidget1 })

    let res = await jsonapiModule.actions.getRelated(stubContext, 'widget/3/widgets')

    expect(res).to.deep.equal({ widgets: storeWidget1 })
  })

  test('Should handle API errors (initial GET)', async function () {
    // Fake an API error response
    mockApi.onGet().replyOnce(500)

    try {
      await jsonapiModule.actions.getRelated(stubContext, 'none/1')
    } catch (error) {
      expect(error.response.status).to.equal(500)
    }
  })

  test('Should handle data: null (empty to-one rels)', async function () {
    jsonWidget1['relationships']['widgets']['data'] = null
    delete jsonWidget1['relationships']['widgets']['links']
    mockApi.onGet().replyOnce(200, { data: jsonWidget1 })
    let res = await jsonapiModule.actions.getRelated(stubContext, 'widget/1')
    expect(res).to.deep.equal({ widgets: {} })
  })

  test('Should handle API errors (in the data)', async function () {
    mockApi.onGet().replyOnce(200, { data: jsonWidget1 }).onGet().replyOnce(500)

    try {
      await jsonapiModule.actions.getRelated(stubContext, 'widget/1')
    } catch (error) {
      expect(error.response.status).to.equal(500)
    }
  })

  test('Should handle API errors (in the links)', async function () {
    // Remove data so it will fallback to using links
    delete jsonWidget1['relationships']['widgets']['data']
    mockApi.onGet().replyOnce(200, { data: jsonWidget1 }).onGet().replyOnce(500)

    try {
      await jsonapiModule.actions.getRelated(stubContext, 'widget/1')
    } catch (error) {
      expect(error.response.status).to.equal(500)
    }
  })
})
