import { expect } from 'chai'

import createStubContext from '../stubs/context'
import createJsonapiModule from '../utils/create-jsonapi-module'
import {
  jsonFormat as createJsonWidget1,
  normFormat as createNormWidget1,
  storeFormat as createStoreWidget1,
} from '../fixtures/widget_1'
import {
  jsonFormat as createJsonWidget2,
  storeFormat as createStoreWidget2,
  normFormat as createNormWidget2,
} from '../fixtures/widget_2'
import {
  jsonFormat as createJsonWidget3,
  normFormat as createNormWidget3,
} from '../fixtures/widget_3'

describe('getRelated', function() {
  let json_widget_1,
    json_widget_2,
    json_widget_3,
    norm_widget_1,
    norm_widget_2,
    store_widget_1,
    store_widget_2,
    store_widget_1_3,
    jsonapiModule,
    stub_context

  beforeEach(function() {
    json_widget_1 = createJsonWidget1()
    json_widget_2 = createJsonWidget2()
    json_widget_3 = createJsonWidget3()

    norm_widget_1 = createNormWidget1()
    norm_widget_2 = createNormWidget2()

    store_widget_1 = createStoreWidget1()
    store_widget_2 = createStoreWidget2()
    store_widget_1_3 = {
      widget: {
        1: createNormWidget1(),
        3: createNormWidget3(),
      },
    }

    jsonapiModule = createJsonapiModule(this.api)
    stub_context = createStubContext(jsonapiModule)
  })

  it('Should throw an error if passed an object with no id', function() {
    delete norm_widget_1['_jv']['id']
    // Wrap method in an empty method to catch transpiled throw (https://www.chaijs.com/api/bdd/#method_throw)
    expect(() =>
      jsonapiModule.actions.getRelated(stub_context, norm_widget_1)
    ).to.throw('No id specified')
  })

  it("should get a record's single related item (using 'data')", async function() {
    this.mock_api
      .onGet()
      .replyOnce(200, { data: json_widget_1 })
      .onGet()
      .replyOnce(200, { data: json_widget_2 })

    let res = await jsonapiModule.actions.getRelated(
      stub_context,
      norm_widget_1
    )

    expect(res).to.deep.equal({ widgets: store_widget_2 })
  })

  it("should get a record's related items (using 'data')", async function() {
    // Return main item, then its related items
    this.mock_api
      .onGet()
      .replyOnce(200, { data: json_widget_2 })
      .onGet()
      .replyOnce(200, { data: json_widget_1 })
      .onGet()
      .replyOnce(200, { data: json_widget_3 })

    let res = await jsonapiModule.actions.getRelated(
      stub_context,
      norm_widget_2
    )

    expect(res).to.deep.equal({ widgets: store_widget_1_3 })
  })

  it("should get a record's related items (using 'links' string)", async function() {
    // Remove data so it will fallback to using links
    delete json_widget_1['relationships']['widgets']['data']
    this.mock_api
      .onGet()
      .replyOnce(200, { data: json_widget_1 })
      .onGet()
      .replyOnce(200, { data: json_widget_2 })

    let res = await jsonapiModule.actions.getRelated(
      stub_context,
      norm_widget_1
    )

    expect(res).to.deep.equal({ widgets: store_widget_2 })
  })

  it("should get a record's related items (using 'links' object)", async function() {
    // Remove data so it will fallback to using links
    delete json_widget_1['relationships']['widgets']['data']
    // Replace links string with links object
    json_widget_1['relationships']['widgets']['links']['related'] = {
      href: '/widget/1/widgets',
    }
    this.mock_api
      .onGet()
      .replyOnce(200, { data: json_widget_1 })
      .onGet()
      .replyOnce(200, { data: json_widget_2 })

    let res = await jsonapiModule.actions.getRelated(
      stub_context,
      norm_widget_1
    )

    expect(res).to.deep.equal({ widgets: store_widget_2 })
  })

  it("should get a record's related items (string path)", async function() {
    this.mock_api
      .onGet()
      .replyOnce(200, { data: json_widget_2 })
      .onGet()
      .replyOnce(200, { data: json_widget_1 })
      .onGet()
      .replyOnce(200, { data: json_widget_3 })

    let res = await jsonapiModule.actions.getRelated(stub_context, 'widget/2')

    expect(res).to.deep.equal({ widgets: store_widget_1_3 })
  })

  it('should return related data for a specific relname', async function() {
    this.mock_api
      .onGet()
      .replyOnce(200, { data: json_widget_3 })
      .onGet()
      .replyOnce(200, { data: json_widget_1 })

    let res = await jsonapiModule.actions.getRelated(
      stub_context,
      'widget/3/widgets'
    )

    expect(res).to.deep.equal({ widgets: store_widget_1 })
  })

  it('Should handle API errors', async function() {
    // Fake an API error response
    this.mock_api.onGet().replyOnce(500)

    try {
      await jsonapiModule.actions.getRelated(stub_context, 'none/1')
    } catch (error) {
      expect(error.response.status).to.equal(500)
    }
  })

  it('Should handle API errors (in the links)', async function() {
    // Remove data so it will fallback to using links
    delete json_widget_1['relationships']['widgets']['data']
    this.mock_api
      .onGet()
      .replyOnce(200, { data: json_widget_1 })
      .onGet()
      .replyOnce(500)

    try {
      await jsonapiModule.actions.getRelated(stub_context, norm_widget_1)
    } catch (error) {
      expect(error.response.status).to.equal(500)
    }
  })
})
