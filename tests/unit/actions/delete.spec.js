import { expect } from 'chai';

import createStubContext from '../stubs/context';
import createJsonapiModule from '../utils/create-jsonapi-module';
import {
  jsonFormat as createJsonWidget1,
  normFormat as createNormWidget1,
} from '../fixtures/widget_1';

describe("delete", function() {
  let json_widget_1, norm_widget_1, jsonapiModule, stub_context;

  beforeEach(function() {
    json_widget_1 = createJsonWidget1();
    norm_widget_1 = createNormWidget1();

    jsonapiModule = createJsonapiModule(this.api);
    stub_context = createStubContext(jsonapiModule);
  });

  it("should make an api call to DELETE item(s)", async function() {
    this.mock_api.onAny().reply(204)

    await jsonapiModule.actions.delete(stub_context, norm_widget_1)

    expect(this.mock_api.history.delete[0].url).to.equal(`/${norm_widget_1['_jv']['type']}/${norm_widget_1['_jv']['id']}`)
  })

  it("should accept axios config as the 2nd arg in a list", async function() {
    this.mock_api.onAny().reply(200, { data: json_widget_1 })
    const params = { filter: "color" }

    await jsonapiModule.actions.delete(stub_context, [ norm_widget_1, { params: params } ])

    expect(this.mock_api.history.delete[0].params).to.equal(params)
  })

  it("should delete a record from the store", async function() {
    this.mock_api.onAny().reply(204)

    await jsonapiModule.actions.delete(stub_context, norm_widget_1)

    expect(stub_context.commit).to.have.been.calledWith("delete_record", norm_widget_1)
  })

  it("should delete a record (string) from the store", async function()  {
    this.mock_api.onAny().reply(204)

    // Leading slash is incorrect syntax, but we should handle it so test with it in
    await jsonapiModule.actions.delete(stub_context, "widget/1")

    expect(stub_context.commit).to.have.been.calledWith("delete_record", "widget/1")
  })

  it("should return deleted object if passed back by server", async function() {
    this.mock_api.onAny().reply(200, { data: json_widget_1 })

    // Leading slash is incorrect syntax, but we should handle it so test with it in
    let res = await jsonapiModule.actions.delete(stub_context, norm_widget_1)

    expect(res).to.deep.equal(norm_widget_1)
  })

  it("should handle API errors", async function() {
    this.mock_api.onAny().reply(500)

    try {
      await jsonapiModule.actions.delete(stub_context, norm_widget_1)
    } catch (error) {
      expect(error.response.status).to.equal(500)
    }
  })
})
