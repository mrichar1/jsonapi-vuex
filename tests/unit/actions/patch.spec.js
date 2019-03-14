import { expect } from 'chai';

import createStubContext from '../stubs/context';
import createJsonapiModule from '../utils/create-jsonapi-module';
import {
  jsonFormat as createJsonWidget1,
  jsonFormatPatch as createJsonWidget1Patch,
  normFormat as createNormWidget1,
  normFormatPatch as createNormWidget1Patch,
  normFormatUpdate as createNormWidget1Update,
} from '../fixtures/widget_1';
import {
  createResponseMeta
} from '../fixtures/server_response';

describe("patch", function() {
  let json_widget_1, json_widget_1_patch, norm_widget_1, norm_widget_1_patch,
    norm_widget_1_update, jsonapiModule, stub_context;

  beforeEach(function() {
    json_widget_1 = createJsonWidget1();
    json_widget_1_patch = createJsonWidget1Patch();
    norm_widget_1 = createNormWidget1();
    norm_widget_1_patch = createNormWidget1Patch();
    norm_widget_1_update = createNormWidget1Update();

    jsonapiModule = createJsonapiModule(this.api);
    stub_context = createStubContext(jsonapiModule);
  });

  it("should make an api call to PATCH item(s)", async function() {
    this.mock_api.onAny().reply(200, { data: json_widget_1 })

    await jsonapiModule.actions.patch(stub_context, norm_widget_1_patch)

    expect(this.mock_api.history.patch[0].url).to.equal(`/${norm_widget_1_patch['_jv']['type']}/${norm_widget_1_patch['_jv']['id']}`)
  })

  it("should accept axios config as the 2nd arg in a list", async function() {
    this.mock_api.onAny().reply(200, { data: json_widget_1 })
    const params = { filter: "color" }

    await jsonapiModule.actions.patch(stub_context, [ norm_widget_1_patch, { params: params } ])

    expect(this.mock_api.history.patch[0].params).to.equal(params)
  })

  it("should delete then add record(s) in the store (from server response)", async function() {
    this.mock_api.onAny().reply(200,  { data: json_widget_1_patch })

    await jsonapiModule.actions.patch(stub_context, norm_widget_1_patch)

    expect(stub_context.commit).to.have.been.calledWith("delete_record", norm_widget_1_patch)
    expect(stub_context.commit).to.have.been.calledWith("add_records", norm_widget_1_update)
  })

  it("should update record(s) in the store (no server response)", async function() {
    this.mock_api.onAny().reply(204)

    await jsonapiModule.actions.patch(stub_context, norm_widget_1_patch)

    expect(stub_context.commit).to.have.been.calledWith("update_record", norm_widget_1_patch)
  })

  it("should return data via the 'get' getter", async function() {
    this.mock_api.onAny().reply(204)

    await jsonapiModule.actions.patch(stub_context, norm_widget_1_patch)

    expect(stub_context.getters.get).to.have.been.calledWith(norm_widget_1_patch)
  })

  it("should preserve json in _jv in returned data", async function() {
    let meta = createResponseMeta();
    let jm = createJsonapiModule(this.api, { 'preserve_json': true })
    // Mock server data to include a meta section
    this.mock_api.onAny().reply(200, { data: json_widget_1, ...meta })

    let res = await jm.actions.patch(stub_context, norm_widget_1_patch)

    // json should now be nested in _jv/json
    expect(res['_jv']['json']).to.deep.equal(meta)
  })

  it("should handle API errors", async function() {
    this.mock_api.onAny().reply(500)

    try {
      await jsonapiModule.actions.patch(stub_context, norm_widget_1)
    } catch (error) {
      expect(error.response.status).to.equal(500)
    }
  })
})
