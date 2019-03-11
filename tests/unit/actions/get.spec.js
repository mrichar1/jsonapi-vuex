import { expect } from 'chai';

import createStubContext from '../stubs/context';
import createJsonapiModule from '../utils/create-jsonapi-module';
import {
  jsonFormat as createJsonWidget1,
  normFormat as createNormWidget1,
} from '../fixtures/widget_1';
import {
  jsonFormat as createJsonWidget2,
  normFormat as createNormWidget2,
} from '../fixtures/widget_2';
import {
  jsonFormat as createJsonMachine1,
  normFormat as createNormMachine1,
} from '../fixtures/machine_1';
import {
  jsonFormat as createJsonRecord,
  normFormatWithRels as createNormRecordRels,
  storeFormat as createStoreRecord,
} from '../fixtures/record';
import {
  createResponseMeta
} from '../fixtures/server_response';

describe("get", function() {

  let json_machine_1, norm_machine_1, json_widget_1, json_widget_2,
    norm_widget_1, norm_widget_1_rels, norm_widget_2, norm_record_rels,
    store_record, json_record, meta, jsonapiModule, stub_context;

  beforeEach(function() {
    json_machine_1 = createJsonMachine1();
    norm_machine_1 = createNormMachine1();
    json_widget_1 = createJsonWidget1();
    json_widget_2 = createJsonWidget2();
    norm_widget_1 = createNormWidget1();
    norm_widget_2 = createNormWidget2();
    norm_record_rels = createNormRecordRels();
    norm_widget_1_rels = norm_record_rels[norm_widget_1['_jv']['id']];
    store_record = createStoreRecord();
    json_record = createJsonRecord();
    meta = createResponseMeta();
    jsonapiModule = createJsonapiModule(this.api);
    stub_context = createStubContext(jsonapiModule);
  });

  it("should make an api call to GET item(s)", async function() {
    this.mock_api.onAny().reply(200, { data: json_widget_1 })

    await jsonapiModule.actions.get(stub_context, norm_widget_1)

    expect(this.mock_api.history.get[0].url).to.equal(`/${norm_widget_1['_jv']['type']}/${norm_widget_1['_jv']['id']}`)
  })

  it("should make an api call to GET a collection", async function() {
    this.mock_api.onAny().reply(200, { data: json_widget_1 })
    delete norm_widget_1['_jv']['id']

    await jsonapiModule.actions.get(stub_context, norm_widget_1)

    expect(this.mock_api.history.get[0].url).to.equal(`/${norm_widget_1['_jv']['type']}`)
  })

  it("should accept axios config as the 2nd arg in a list", async function() {
    this.mock_api.onAny().reply(200, { data: json_widget_1 })
    const params = { filter: "color" }

    await jsonapiModule.actions.get(stub_context, [ norm_widget_1, { params: params } ])

    expect(this.mock_api.history.get[0].params).to.equal(params)
  })

  it("should add record(s) in the store", async function() {
    this.mock_api.onAny().reply(200, { data: json_widget_1 })

    await jsonapiModule.actions.get(stub_context, norm_widget_1)

    expect(stub_context.commit).to.have.been.calledWith("add_records", norm_widget_1)
  })

  it("should add record(s) (string) in the store", async function()  {
    this.mock_api.onAny().reply(200, { data: json_widget_1 })

    // Leading slash is incorrect syntax, but we should handle it so test with it in
    await jsonapiModule.actions.get(stub_context, "widget/1")

    expect(stub_context.commit).to.have.been.calledWith("add_records", norm_widget_1)
  })

  it("should return normalized data", async function() {
    this.mock_api.onAny().reply(200, { data: json_widget_1 })

    let res = await jsonapiModule.actions.get(stub_context, norm_widget_1)

    expect(res).to.deep.equal(norm_widget_1)
  })

  it("should add included record(s) to the store", async function() {
    // included array can include objects from different collections
    const data = {
      data: json_widget_1,
      included: [ json_widget_2, json_machine_1 ]
    }
    this.mock_api.onAny().reply(200, data)

    // for a real API call, would need axios include params here
    await jsonapiModule.actions.get(stub_context, norm_widget_1)

    expect(stub_context.commit).to.have.been.calledWith("add_records", norm_widget_2)
    expect(stub_context.commit).to.have.been.calledWith("add_records", norm_machine_1)
  })

  it("should return normalized data with expanded rels (single item)", async function() {
    const jm = createJsonapiModule(this.api, { 'follow_relationships_data': true })
    // Make state contain all records for rels to work
    stub_context['state'] = store_record
    this.mock_api.onAny().reply(200, { data: json_widget_1 })

    let res = await jm.actions.get(stub_context, norm_widget_1)

    expect(res).to.deep.equal(norm_widget_1_rels)
  })

  it("should return normalized data with expanded rels (array)", async function() {
    const jm = createJsonapiModule(this.api, { 'follow_relationships_data': true })
    // Make state contain all records for rels to work
    stub_context['state'] = store_record
    this.mock_api.onAny().reply(200, json_record)

    let res = await jm.actions.get(stub_context, "widget")

    expect(res).to.deep.equal(norm_record_rels)
  })

  it("should handle an empty rels 'data' object", async function() {
    const jm = createJsonapiModule(this.api, { 'follow_relationships_data': true })
    // Delete contents of data and remove links
    json_widget_1['relationships']['widgets']['data'] = {}
    delete json_widget_1['relationships']['widgets']['links']
    this.mock_api.onAny().reply(200, { data: json_widget_1 })

    let res = await jm.actions.get(stub_context, norm_widget_1)

    expect(res['_jv']['rels']['widgets']).to.deep.equal({})
  })

  it("should preserve json in _jv in returned data", async function() {
    const jm = createJsonapiModule(this.api, { 'preserve_json': true })
    // Mock server to only return a meta section
    this.mock_api.onAny().reply(200, meta)

    let res = await jm.actions.get(stub_context, "widget")

    // json should now be nested in _jv/json
    expect(res['_jv']['json']).to.deep.equal(meta)
  })

  it("should not preserve json in _jv in returned data", async function() {
    const jm = createJsonapiModule(this.api, { 'preserve_json': false })
    // Mock server to only return a meta section
    this.mock_api.onAny().reply(200, meta)

    let res = await jm.actions.get(stub_context, "widget")

    // collections should have no top-level _jv
    expect(res).to.not.have.key('_jv')
  })

  it("should handle API errors", async function() {
    this.mock_api.onAny().reply(500)

    try {
      await jsonapiModule.actions.get(stub_context, norm_widget_1)
    } catch(error) {
      expect(error.response.status).to.equal(500)
    }
  })
})
