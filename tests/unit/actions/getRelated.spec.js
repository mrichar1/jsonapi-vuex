import { expect } from 'chai'

import createStubContext from '../stubs/context'
import createJsonapiModule from '../utils/createJsonapiModule'
import {
  jsonFormat as createJsonWidget1,
  normFormat as createNormWidget1,
  storeFormat as createStoreWidget1,
} from '../fixtures/widget1'
import {
  jsonFormat as createJsonWidget2,
  storeFormat as createStoreWidget2,
  normFormat as createNormWidget2,
} from '../fixtures/widget2'
import {
  jsonFormat as createJsonWidget3,
  normFormat as createNormWidget3,
} from '../fixtures/widget3'

describe('getRelated', function() {
  let jsonWidget1,
    jsonWidget2,
    jsonWidget3,
    normWidget1,
    normWidget2,
    storeWidget1,
    storeWidget2,
    storeWidget1_3, // eslint-disable-line camelcase
    jsonapiModule,
    stubContext

  beforeEach(function() {
    jsonWidget1 = createJsonWidget1()
    jsonWidget2 = createJsonWidget2()
    jsonWidget3 = createJsonWidget3()

    normWidget1 = createNormWidget1()
    normWidget2 = createNormWidget2()

    storeWidget1 = createStoreWidget1()
    storeWidget2 = createStoreWidget2()
    // eslint-disable-next-line camelcase
    storeWidget1_3 = {
      widget: {
        1: createNormWidget1(),
        3: createNormWidget3(),
      },
    }

    jsonapiModule = createJsonapiModule(this.api)
    stubContext = createStubContext(jsonapiModule)
  })

  it('Should throw an error if passed an object with no id', async function() {
    delete normWidget1['_jv']['id']
    // Wrap method in an empty method to catch transpiled throw (https://www.chaijs.com/api/bdd/#methodThrow)
    try {
      await jsonapiModule.actions.getRelated(stubContext, normWidget1)
      throw 'Should have thrown an error (no id)'
    } catch (error) {
      expect(error).to.equal('No id specified')
    }
  })

  it("should get a record's single related item (using 'data')", async function() {
    this.mockApi
      .onGet()
      .replyOnce(200, { data: jsonWidget1 })
      .onGet()
      .replyOnce(200, { data: jsonWidget2 })

    let res = await jsonapiModule.actions.getRelated(stubContext, normWidget1)

    expect(res).to.deep.equal({ widgets: storeWidget2 })
  })

  it("should get a record's related items (using 'data')", async function() {
    // Return main item, then its related items
    this.mockApi
      .onGet()
      .replyOnce(200, { data: jsonWidget2 })
      .onGet()
      .replyOnce(200, { data: jsonWidget1 })
      .onGet()
      .replyOnce(200, { data: jsonWidget3 })

    let res = await jsonapiModule.actions.getRelated(stubContext, normWidget2)

    expect(res).to.deep.equal({ widgets: storeWidget1_3 }) // eslint-disable-line camelcase
  })

  it("should get a record's related items (using 'links' string)", async function() {
    // Remove data so it will fallback to using links
    delete jsonWidget1['relationships']['widgets']['data']
    this.mockApi
      .onGet()
      .replyOnce(200, { data: jsonWidget1 })
      .onGet()
      .replyOnce(200, { data: jsonWidget2 })

    let res = await jsonapiModule.actions.getRelated(stubContext, normWidget1)

    expect(res).to.deep.equal({ widgets: storeWidget2 })
  })

  it("should get a record's related items (using 'links' object)", async function() {
    // Remove data so it will fallback to using links
    delete jsonWidget1['relationships']['widgets']['data']
    // Replace links string with links object
    jsonWidget1['relationships']['widgets']['links']['related'] = {
      href: '/widget/1/widgets',
    }
    this.mockApi
      .onGet()
      .replyOnce(200, { data: jsonWidget1 })
      .onGet()
      .replyOnce(200, { data: jsonWidget2 })

    let res = await jsonapiModule.actions.getRelated(stubContext, normWidget1)

    expect(res).to.deep.equal({ widgets: storeWidget2 })
  })

  it("should get a record's related items (string path)", async function() {
    this.mockApi
      .onGet()
      .replyOnce(200, { data: jsonWidget2 })
      .onGet()
      .replyOnce(200, { data: jsonWidget1 })
      .onGet()
      .replyOnce(200, { data: jsonWidget3 })

    let res = await jsonapiModule.actions.getRelated(stubContext, 'widget/2')

    expect(res).to.deep.equal({ widgets: storeWidget1_3 }) // eslint-disable-line camelcase
  })

  it('should return related data for a specific relname', async function() {
    this.mockApi
      .onGet()
      .replyOnce(200, { data: jsonWidget3 })
      .onGet()
      .replyOnce(200, { data: jsonWidget1 })

    let res = await jsonapiModule.actions.getRelated(
      stubContext,
      'widget/3/widgets'
    )

    expect(res).to.deep.equal({ widgets: storeWidget1 })
  })

  it('Should handle API errors', async function() {
    // Fake an API error response
    this.mockApi.onGet().replyOnce(500)

    try {
      await jsonapiModule.actions.getRelated(stubContext, 'none/1')
    } catch (error) {
      expect(error.response.status).to.equal(500)
    }
  })

  it('Should handle API errors (in the links)', async function() {
    // Remove data so it will fallback to using links
    delete jsonWidget1['relationships']['widgets']['data']
    this.mockApi
      .onGet()
      .replyOnce(200, { data: jsonWidget1 })
      .onGet()
      .replyOnce(500)

    try {
      await jsonapiModule.actions.getRelated(stubContext, normWidget1)
    } catch (error) {
      expect(error.response.status).to.equal(500)
    }
  })
})
