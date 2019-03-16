import { expect } from "chai";

import createStubContext from "../stubs/context";
import createJsonapiModule from "../utils/create-jsonapi-module";
import {
  jsonFormat as createJsonWidget1,
  normFormat as createNormWidget1
} from "../fixtures/widget_1";
import { createResponseMeta } from "../fixtures/server_response";

describe("post", function() {
  let json_widget_1, norm_widget_1, jsonapiModule, stub_context;

  beforeEach(function() {
    json_widget_1 = createJsonWidget1();
    norm_widget_1 = createNormWidget1();

    jsonapiModule = createJsonapiModule(this.api);
    stub_context = createStubContext(jsonapiModule);
  });

  it("should make an api call to POST item(s)", async function() {
    this.mock_api.onAny().reply(201, { data: json_widget_1 });

    await jsonapiModule.actions.post(stub_context, norm_widget_1);

    expect(this.mock_api.history.post[0].url).to.equal(
      `/${norm_widget_1["_jv"]["type"]}`
    );
  });

  it("should accept axios config as the 2nd arg in a list", async function() {
    this.mock_api.onAny().reply(201, { data: json_widget_1 });
    const params = { filter: "color" };

    await jsonapiModule.actions.post(stub_context, [
      norm_widget_1,
      { params: params }
    ]);

    expect(this.mock_api.history.post[0].params).to.equal(params);
  });

  it("should add record(s) to the store", async function() {
    this.mock_api.onAny().reply(201, { data: json_widget_1 });

    await jsonapiModule.actions.post(stub_context, norm_widget_1);

    expect(stub_context.commit).to.have.been.calledWith(
      "add_records",
      norm_widget_1
    );
  });

  it("should add record(s) in the store (no server response)", async function() {
    this.mock_api.onAny().reply(204);

    await jsonapiModule.actions.post(stub_context, norm_widget_1);

    expect(stub_context.commit).to.have.been.calledWith(
      "add_records",
      norm_widget_1
    );
  });

  it("should return data via the 'get' getter", async function() {
    this.mock_api.onAny().reply(201, { data: json_widget_1 });

    await jsonapiModule.actions.post(stub_context, norm_widget_1);

    expect(stub_context.getters.get).to.have.been.calledWith(norm_widget_1);
  });

  it("should POST data", async function() {
    this.mock_api.onAny().reply(201, { data: json_widget_1 });

    await jsonapiModule.actions.post(stub_context, norm_widget_1);

    // History stores data as JSON string, so parse back to object
    expect(JSON.parse(this.mock_api.history.post[0].data)).to.deep.equal({
      data: json_widget_1
    });
  });

  it("should preserve json in _jv in returned data", async function() {
    let meta = createResponseMeta();
    let jsonapiModule = createJsonapiModule(this.api, { preserve_json: true });
    // Mock server data to include a meta section
    this.mock_api.onAny().reply(201, { data: json_widget_1, ...meta });

    let res = await jsonapiModule.actions.post(stub_context, norm_widget_1);

    // json should now be nested in _jv/json
    expect(res["_jv"]["json"]).to.deep.equal(meta);
  });

  it("should handle API errors", async function() {
    this.mock_api.onAny().reply(500);

    try {
      await jsonapiModule.actions.post(stub_context, norm_widget_1);
    } catch (error) {
      expect(error.response.status).to.equal(500);
    }
  });
});
