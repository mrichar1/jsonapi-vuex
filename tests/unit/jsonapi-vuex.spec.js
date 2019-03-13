import chai, { expect } from 'chai';
import chaiAsPromised from 'chai-as-promised';
import chaiExclude from 'chai-exclude';
import sinonChai from 'sinon-chai';
import axios from 'axios';
import MockAdapter from 'axios-mock-adapter';

import { _testing, jsonapiModule } from '../../src/jsonapi-vuex';
import createStubContext from './stubs/context';
import {
  jsonFormat as createJsonWidget1,
  jsonFormatPatch as createJsonWidget1Patch,
  normFormat as createNormWidget1,
  normFormatWithRels as createNormWidget1WithRels,
  normFormatPatch as createNormWidget1Patch,
  normFormatUpdate as createNormWidget1Update,
  storeFormat as createStoreWidget1,
} from './fixtures/widget_1';
import {
  jsonFormat as createJsonWidget2,
  normFormat as createNormWidget2,
  normFormatWithRels as createNormWidget2WithRels,
  storeFormat as createStoreWidget2,
} from './fixtures/widget_2';
import {
  jsonFormat as createJsonWidget3,
  normFormat as createNormWidget3,
} from './fixtures/widget_3';
import {
  jsonFormat as createJsonRecord,
  normFormatWithRels as createNormRecordRels,
  storeFormat as createStoreRecord
} from './fixtures/record';
import {
  createResponseMeta
} from './fixtures/server_response';

chai.use(sinonChai)
chai.use(chaiAsPromised)
chai.use(chaiExclude)

// 'global' variables (redefined in beforeEach)
let jm, clock, stub_context,
 json_widget_1, json_widget_2, json_widget_3, json_widget_1_patch, json_record, meta,
 norm_widget_1, norm_widget_2, norm_widget_3,
 norm_widget_1_rels, norm_widget_2_rels, norm_widget_1_patch, norm_widget_1_update,
 norm_record, norm_record_rels,
 store_widget_1, store_widget_1_update, store_widget_2, store_widget_1_3, store_record

// Mock up a fake axios-like api instance
const api = axios.create({ baseURL: '' })
let mock_api = new MockAdapter(api);

beforeEach(function() {
  // Set up fake timers
  clock = sinon.useFakeTimers()

  // Remove mock handlers
  mock_api.reset()

  // Set up commonly used data objects

  // Turn off following by default to simplify test data in most cases
  jm = jsonapiModule(api, {
    'follow_relationships_data': false,
    'preserve_json': false,
    'action_status_clean_interval': 0
  })

  // Stub the context's commit function to evaluate calls to it.
  stub_context = createStubContext(jm);

  // Data in JSONAPI JSON form

  json_widget_1 = createJsonWidget1();
  json_widget_2 = createJsonWidget2();
  json_widget_3 = createJsonWidget3();
  json_widget_1_patch = createJsonWidget1Patch();
  json_record = createJsonRecord();

  // META only data
  meta = createResponseMeta();

  // Data in Normalised/Restructured form

  norm_widget_1 = createNormWidget1();
  norm_widget_1_patch = createNormWidget1Patch();
  norm_widget_1_update = createNormWidget1Update();

  norm_widget_2 = createNormWidget2();
  norm_widget_3 = createNormWidget3();

  norm_widget_1_rels = createNormWidget1WithRels();
  norm_widget_2_rels = createNormWidget2WithRels();

  norm_record = {
    [norm_widget_1['_jv']['id']]: norm_widget_1,
    [norm_widget_2['_jv']['id']]: norm_widget_2,
    [norm_widget_3['_jv']['id']]: norm_widget_3
  }

  norm_record_rels = createNormRecordRels();

  // Data in Store form

  store_widget_1 = createStoreWidget1();
  store_widget_2 = createStoreWidget2();

  store_widget_1_3 = {
    'widget':{
      '1': {
        ...norm_widget_1
      },
      '3': {
        ...norm_widget_3
      }
    }
  }

  store_widget_1_update = {
    'widget': {
      '1': {
        ...norm_widget_1_update
      }
    }
  }

  store_record = createStoreRecord();

  this.api = api;
  this.mock_api = mock_api;
  this.jsonapiModule = jm;
})

afterEach(function() {

  // Undo fake timers
  clock = sinon.restore()

})

describe("jsonapi-vuex tests", function() {

  it("should export jsonapiModule", function()  {
    expect(jsonapiModule).to.exist;
  });

  describe("config handling", function() {
    it("Should override default config", function() {
      const conf = { 'jvtag': '_splat' }
      const { jvConfig } = _testing
      jm = jsonapiModule(api, conf)
      expect(jvConfig['jvtag']).to.equal('_splat')
    })
  });

  describe("jsonapiModule actions", function()  {

    require('./actions/get.spec');

    describe("fetch", function() {
      it("should be an alias for get", function() {
        expect(jm.actions.fetch).to.equal(jm.actions.get)
      })
    })

    describe("getRelated", function() {
      it("Should throw an error if passed an object with no id", function() {
        delete norm_widget_1['_jv']['id']
        // Wrap method in an empty method to catch transpiled throw (https://www.chaijs.com/api/bdd/#method_throw)
        expect(() => jm.actions.getRelated(stub_context, norm_widget_1)).to.throw("No id specified")
      })
      it("should get a record's single related item (using 'data')", async function() {
        mock_api
          .onGet().replyOnce(200, { data: json_widget_1 })
          .onGet().replyOnce(200, { data: json_widget_2 })
        let res = await jm.actions.getRelated(stub_context, norm_widget_1)
        expect(res).to.deep.equal({ 'widgets' : store_widget_2 })
      })
      it("should get a record's related items (using 'data')", async function() {
        // Return main item, then its related items
        mock_api
          .onGet().replyOnce(200, { data: json_widget_2 })
          .onGet().replyOnce(200, { data: json_widget_1 })
          .onGet().replyOnce(200, { data: json_widget_3 })
        let res = await jm.actions.getRelated(stub_context, norm_widget_2)
        expect(res).to.deep.equal({ 'widgets': store_widget_1_3 })
      })
      it("should get a record's related items (using 'links' string)", async function() {
        // Remove data so it will fallback to using links
        delete json_widget_1['relationships']['widgets']['data']
        mock_api
          .onGet().replyOnce(200, { data: json_widget_1 })
          .onGet().replyOnce(200, { data: json_widget_2 })
        let res = await jm.actions.getRelated(stub_context, norm_widget_1)
        expect(res).to.deep.equal({ 'widgets': store_widget_2 })
      })
      it("should get a record's related items (using 'links' object)", async function() {
        // Remove data so it will fallback to using links
        delete json_widget_1['relationships']['widgets']['data']
        // Replace links string with links object
        json_widget_1['relationships']['widgets']['links']['related'] = { 'href': '/widget/1/widgets' }
        mock_api
          .onGet().replyOnce(200, { data: json_widget_1 })
          .onGet().replyOnce(200, { data: json_widget_2 })
        let res = await jm.actions.getRelated(stub_context, norm_widget_1)
        expect(res).to.deep.equal({ 'widgets': store_widget_2 })
      })
      it("should get a record's related items (string path)", async function() {
        mock_api
          .onGet().replyOnce(200, { data: json_widget_2 })
          .onGet().replyOnce(200, { data: json_widget_1 })
          .onGet().replyOnce(200, { data: json_widget_3 })
        let res = await jm.actions.getRelated(stub_context, "widget/2")
        expect(res).to.deep.equal({ 'widgets': store_widget_1_3 })
      })
      it("should return related data for a specific relname", async function() {
        mock_api
          .onGet().replyOnce(200, { data: json_widget_3 })
          .onGet().replyOnce(200, { data: json_widget_1 })
        let res = await jm.actions.getRelated(stub_context, "widget/3/widgets")
        expect(res).to.deep.equal({ 'widgets': store_widget_1 })
      })
      it("Should handle API errors", async function() {
        // Fake an API error response
        mock_api.onGet().replyOnce(500)
        try {
          await jm.actions.getRelated(stub_context, "none/1")
        } catch (error) {
          expect(error.response.status).to.equal(500)
        }
      })
      it("Should handle API errors (in the links)", async function() {
        // Remove data so it will fallback to using links
        delete json_widget_1['relationships']['widgets']['data']
        mock_api
          .onGet().replyOnce(200, { data: json_widget_1 })
          .onGet().replyOnce(500)
        try {
          await jm.actions.getRelated(stub_context, norm_widget_1)
        } catch (error) {
          expect(error.response.status).to.equal(500)
        }
      })
    })

    describe("post", function() {
      it("should make an api call to POST item(s)", async function() {
        mock_api.onAny().reply(201, { data: json_widget_1 })
        await jm.actions.post(stub_context, norm_widget_1)
        expect(mock_api.history.post[0].url).to.equal(`/${norm_widget_1['_jv']['type']}`)
      })
      it("should accept axios config as the 2nd arg in a list", async function() {
        mock_api.onAny().reply(201, { data: json_widget_1 })
        const params = { filter: "color" }
        await jm.actions.post(stub_context, [ norm_widget_1, { params: params } ])
        expect(mock_api.history.post[0].params).to.equal(params)
      })
      it("should add record(s) to the store", async function() {
        mock_api.onAny().reply(201, { data: json_widget_1 })
        await jm.actions.post(stub_context, norm_widget_1)
        expect(stub_context.commit).to.have.been.calledWith("add_records", norm_widget_1)
      })
      it("should add record(s) in the store (no server response)", async function() {
        mock_api.onAny().reply(204)
        await jm.actions.post(stub_context, norm_widget_1)
        expect(stub_context.commit).to.have.been.calledWith("add_records", norm_widget_1)
      })
      it("should return data via the 'get' getter", async function() {
        mock_api.onAny().reply(201, { data: json_widget_1 })
        await jm.actions.post(stub_context, norm_widget_1)
        expect(stub_context.getters.get).to.have.been.calledWith(norm_widget_1)
      })
      it("should POST data", async function() {
        mock_api.onAny().reply(201, { data: json_widget_1 })
        await jm.actions.post(stub_context, norm_widget_1)
        // History stores data as JSON string, so parse back to object
        expect(JSON.parse(mock_api.history.post[0].data)).to.deep.equal({ data: json_widget_1 })
      })
      it("should preserve json in _jv in returned data", async function() {
        jm = jsonapiModule(api, { 'preserve_json': true })
        // Mock server data to include a meta section
        mock_api.onAny().reply(201, { data: json_widget_1, ...meta })
        let res = await jm.actions.post(stub_context, norm_widget_1)
        // json should now be nested in _jv/json
        expect(res['_jv']['json']).to.deep.equal(meta)
      })
      it("should handle API errors", async function() {
        mock_api.onAny().reply(500)
        try {
          await jm.actions.post(stub_context, norm_widget_1)
        } catch(error) {
            expect(error.response.status).to.equal(500)
        }
      })
    })

    describe("create", function() {
      it("should be an alias for post", function() {
        expect(jm.actions.create).to.equal(jm.actions.post)
      })
    })

    describe("patch", function() {
      it("should make an api call to PATCH item(s)", async function() {
        mock_api.onAny().reply(200, { data: json_widget_1 })
        await jm.actions.patch(stub_context, norm_widget_1_patch)
        expect(mock_api.history.patch[0].url).to.equal(`/${norm_widget_1_patch['_jv']['type']}/${norm_widget_1_patch['_jv']['id']}`)
      })
      it("should accept axios config as the 2nd arg in a list", async function() {
        mock_api.onAny().reply(200, { data: json_widget_1 })
        const params = { filter: "color" }
        await jm.actions.patch(stub_context, [ norm_widget_1_patch, { params: params } ])
        expect(mock_api.history.patch[0].params).to.equal(params)
      })
      it("should delete then add record(s) in the store (from server response)", async function() {
        mock_api.onAny().reply(200,  { data: json_widget_1_patch })
        await jm.actions.patch(stub_context, norm_widget_1_patch)
        expect(stub_context.commit).to.have.been.calledWith("delete_record", norm_widget_1_patch)
        expect(stub_context.commit).to.have.been.calledWith("add_records", norm_widget_1_update)
      })
      it("should update record(s) in the store (no server response)", async function() {
        mock_api.onAny().reply(204)
        await jm.actions.patch(stub_context, norm_widget_1_patch)
        expect(stub_context.commit).to.have.been.calledWith("update_record", norm_widget_1_patch)
      })
      it("should return data via the 'get' getter", async function() {
        mock_api.onAny().reply(204)
        await jm.actions.patch(stub_context, norm_widget_1_patch)
        expect(stub_context.getters.get).to.have.been.calledWith(norm_widget_1_patch)
      })
      it("should preserve json in _jv in returned data", async function() {
        jm = jsonapiModule(api, { 'preserve_json': true })
        // Mock server data to include a meta section
        mock_api.onAny().reply(200, { data: json_widget_1, ...meta })
        let res = await jm.actions.patch(stub_context, norm_widget_1_patch)
        // json should now be nested in _jv/json
        expect(res['_jv']['json']).to.deep.equal(meta)
      })
      it("should handle API errors", async function() {
        mock_api.onAny().reply(500)
        try {
          await jm.actions.patch(stub_context, norm_widget_1)
        } catch (error) {
          expect(error.response.status).to.equal(500)
        }
      })
    })

    describe("update", function() {
      it("should be an alias for patch", function() {
        expect(jm.actions.update).to.equal(jm.actions.patch)
      })
    })

    describe("delete", function() {
      it("should make an api call to DELETE item(s)", async function() {
        mock_api.onAny().reply(204)
        await jm.actions.delete(stub_context, norm_widget_1)
        expect(mock_api.history.delete[0].url).to.equal(`/${norm_widget_1['_jv']['type']}/${norm_widget_1['_jv']['id']}`)
      })
      it("should accept axios config as the 2nd arg in a list", async function() {
        mock_api.onAny().reply(200, { data: json_widget_1 })
        const params = { filter: "color" }
        await jm.actions.delete(stub_context, [ norm_widget_1, { params: params } ])
        expect(mock_api.history.delete[0].params).to.equal(params)
      })
      it("should delete a record from the store", async function() {
        mock_api.onAny().reply(204)
        await jm.actions.delete(stub_context, norm_widget_1)
        expect(stub_context.commit).to.have.been.calledWith("delete_record", norm_widget_1)
      })
      it("should delete a record (string) from the store", async function()  {
        mock_api.onAny().reply(204)
        // Leading slash is incorrect syntax, but we should handle it so test with it in
        await jm.actions.delete(stub_context, "widget/1")
        expect(stub_context.commit).to.have.been.calledWith("delete_record", "widget/1")
      })
      it("should return deleted object if passed back by server", async function() {
        mock_api.onAny().reply(200, { data: json_widget_1 })
        // Leading slash is incorrect syntax, but we should handle it so test with it in
        let res = await jm.actions.delete(stub_context, norm_widget_1)
        expect(res).to.deep.equal(norm_widget_1)
      })
      it("should handle API errors", async function() {
        mock_api.onAny().reply(500)
        try {
          await jm.actions.delete(stub_context, norm_widget_1)
        } catch (error) {
          expect(error.response.status).to.equal(500)
        }
      })
    })
  }) // actions

  describe("jsonapiModule mutations", function() {

    describe("delete_record", function() {
      it("should delete a record (data) from the Vue store", function() {
        const { delete_record } = jm.mutations
        delete_record(store_widget_1, norm_widget_1)
        expect(store_widget_1[norm_widget_1['_jv']['type']]).to.not.have.key(norm_widget_1['_jv']['id'])
      })
      it("should delete a record (string) from the store", function() {
        const { delete_record } = jm.mutations
        // Leading slash is incorrect syntax, but we should handle it so test with it in
        delete_record(store_widget_1, "widget/1")
        expect(store_widget_1[norm_widget_1['_jv']['type']]).to.not.have.key(norm_widget_1['_jv']['id'])
    })
      it("should throw an error if no type or id present.", function() {
       const { delete_record } = jm.mutations
       // expect needs a function to call, not the return from a function
       expect(() => delete_record(store_widget_1, { '_jv': {}})).to.throw(_testing.RecordError)
      })
    })

    describe("add_records", function() {
      it("should add several records to the store", function() {
        const { add_records } = jm.mutations
        const state = {}
        add_records(state, norm_record)
        expect(state).to.deep.equal(store_record)
      })
    })

    describe("update_record", function() {
      it("should update a specific attribute of a record already in the store", function() {
        const { update_record } = jm.mutations
        update_record(store_widget_1, norm_widget_1_patch)
        expect(store_widget_1).to.deep.equal(store_widget_1_update)
      })
      it("should throw an error if no type or id present.", function() {
        const { update_record } = jm.mutations
        // expect needs a function to call, not the return from a function
        expect(() => update_record(store_widget_1, { '_jv': {}})).to.throw(_testing.RecordError)
      })
    })

    describe("set_status", function() {
      it("should set the status for a specific id", function() {
        const state = { '_jv': {}}
        const { set_status } = jm.mutations
        set_status(state, { id: 2, status: 'splat' })
        expect(state['_jv'][2]).to.have.keys([ 'status', 'time' ])
      })
    })

    describe("delete_status", function() {
      it("should delete the status for a specific id", function() {
        const state = {
          '_jv': {
            1: {
              status: 'SUCCESS',
              time: 0
            }
          }
        }
        const { delete_status } = jm.mutations
        delete_status(state, 1)
        expect(state['_jv']).to.deep.equal({})
      }),
      it("should not error if deleting a non-existent id", function() {
        const state = { '_jv': {}}
        const { delete_status } = jm.mutations
        expect(() => delete_status(state, 2)).to.not.throw()
      })
    })
  })  // mutations

  describe("jsonapiModule helpers", function() {
    describe("getTypeId", function() {
      it("should get type & id from string", function() {
        const { getTypeId } = _testing
        expect(getTypeId("widget/1")).to.deep.equal([ 'widget', '1' ])
      })
      it("should get type only from string", function() {
        const { getTypeId } = _testing
        expect(getTypeId("widget")).to.deep.equal([ 'widget' ])
      })
      it("should get type, id & relname from string", function() {
        const { getTypeId } = _testing
        expect(getTypeId("widget/1/relname")).to.deep.equal([ 'widget', '1', 'relname' ])
      })
      it("should get type & id from norm data", function() {
        const { getTypeId } = _testing
        expect(getTypeId(norm_widget_1)).to.deep.equal([ 'widget', '1' ])
      })
      it("should get type only from norm data", function() {
        const { getTypeId } = _testing
        delete norm_widget_1['_jv']['id']
        expect(getTypeId(norm_widget_1)).to.deep.equal([ 'widget' ])
      })
    })

    describe("jsonapiToNormItem", function() {
      it("should convert jsonapi to normalized for a single item", function() {
        const { jsonapiToNormItem } = _testing
        expect(jsonapiToNormItem(json_widget_1)).to.deep.equal(norm_widget_1)
      });
      it("should preserve deeply nested '_jv' keys", function() {
        const { jsonapiToNormItem } = _testing
        expect(jsonapiToNormItem(json_widget_1)).to.deep.equal(norm_widget_1)
      });
    })

    describe("jsonapiToNorm", function() {
      it("should convert jsonapi to normalized for a single item", function() {
        const { jsonapiToNorm } = _testing
        expect(jsonapiToNorm(json_widget_1)).to.deep.equal(norm_widget_1)
      });

      it("should convert jsonapi to normalized for an array of records", function() {
        const { jsonapiToNorm } = _testing
        expect(jsonapiToNorm(json_record['data'])).to.deep.equal(norm_record)
      });

      it("should return an empty object if input is undefined", function() {
        const { jsonapiToNorm } = _testing
        expect(jsonapiToNorm(undefined)).to.deep.equal({})
      })
    });

    describe("normToJsonapi", function() {
      it("should convert normalized to jsonapi for multiple items", function() {
        const { normToJsonapi } = _testing
        expect(normToJsonapi(norm_record)).to.deep.equal(json_record)
      });

      it("should convert normalized to jsonapi for a single item", function() {
        const { normToJsonapi } = _testing
        expect(normToJsonapi(norm_widget_1)).to.deep.equal({ data: json_widget_1 })
      });
    });

    describe("normToJsonapiItem", function() {
      it("should convert normalized to jsonapi for a single item", function() {
        const { normToJsonapiItem } = _testing
        expect(normToJsonapiItem(norm_widget_1)).to.deep.equal(json_widget_1)
      });
      it("should convert normalized to jsonapi for a single item with no id (POST)", function() {
        const { normToJsonapiItem } = _testing
        delete norm_widget_1['_jv']['id']
        delete json_widget_1['id']
        expect(normToJsonapiItem(norm_widget_1)).to.deep.equal(json_widget_1)
      });
    })

    describe("normToStore", function() {
      it("should convert normalized to store", function() {
        const { normToStore } = _testing
        expect(normToStore(norm_record)).to.deep.equal(store_record)
      })
      it("should convert normalized to store for a single item", function() {
        const { normToStore } = _testing
        expect(normToStore(norm_widget_1)).to.deep.equal(store_widget_1)
      })
    })
    describe("unpackArgs", function() {
      it("Should convert a single arg into an array with empty config", function() {
        const { unpackArgs } = _testing
        expect(unpackArgs('splat')).to.deep.equal([ 'splat', {} ])
      })
      it("Should leave an args array as-is", function() {
        const { unpackArgs } = _testing
        expect(unpackArgs([ 'splat', {} ])).to.deep.equal([ 'splat', {} ])
      })
    })

    describe("followRelationships", function() {
      it("Should expand relationships into rels for a single item", function() {
        const { followRelationships } = _testing
        let rels = followRelationships(store_record, norm_widget_1)['_jv']['rels']['widgets']
        expect(rels).to.deep.equal(norm_widget_2)
      })
    })

    describe("actionSequence", function() {
      it("Should return incrementing numbers", function() {
        // Set fake context for timeout callback
        let context = { commit: () => {} }
        let { actionSequence } = _testing
        expect(actionSequence(context)).to.be.below(actionSequence(context))
      })
      it("Should call delete_status after timeout", function() {
        let { actionSequence, jvConfig } = _testing
        jvConfig['action_status_clean_age'] = 10
        actionSequence(stub_context)
        clock.tick(11000)
        expect(stub_context.commit).to.have.been.calledWith('delete_status')
      })
    })
  }); // Helper methods

  describe("jsonapiModule getters", function() {

    describe("get", function() {
      it("should return all state", function() {
        const { get } = jm.getters
        const result = get(store_record)()
        expect(result).to.deep.equal(store_record)
      })
      it("should return all state for a single endpoint", function() {
        const { get } = jm.getters
        const result = get(store_record)({ '_jv': { 'type': 'widget' }})
        expect(result).to.deep.equal(norm_record)
      })
      it("should return all state for a single endpoint with a single record", function() {
        const { get } = jm.getters
        const result = get(store_widget_1)({ '_jv': { 'type': 'widget' }})
        expect(result).to.deep.equal(store_widget_1['widget'])
      })
      it("should return a single id from state", function() {
        const { get } = jm.getters
        const result = get(store_widget_1)({ '_jv': { 'type': 'widget', 'id': '1' }})
        expect(result).to.deep.equal(norm_widget_1)
      })
      it("should accept a string path to object", function() {
        const { get } = jm.getters
        const result = get(store_widget_1)('widget/1')
        expect(result).to.deep.equal(norm_widget_1)
      })
      it("should filter results using jsonpath, returning a single item", function() {
        const { get } = jm.getters
        const result = get(store_record)('widget', '$[?(@.bar=="baz")]')
        expect(result).to.deep.equal({ [norm_widget_1['_jv']['id']] : norm_widget_1 })
      })
      it("should filter results using jsonpath, returning multiple items", function() {
        const { get } = jm.getters
        const result = get(store_record)('widget', '$[?(@.foo)]')
        expect(result).to.deep.equal(norm_record)
      })
      it("should filter results using jsonpath, returning no items", function() {
        const { get } = jm.getters
        const result = get(store_record)('widget', '$[?(@.nosuchkey)]')
        expect(result).to.deep.equal({})
      })
      it("should filter whole store using jsonpath, returning a single item", function() {
        const { get } = jm.getters
        // Return all records of any type with id: 1
        const result = get(store_record)('', '$.*.1')
        expect(result).to.deep.equal({ [norm_widget_1['_jv']['id']] : norm_widget_1 })
      })
      it("should return empty object if type not in state", function() {
        const { get } = jm.getters
        const result = get({})('widget')
        expect(result).to.deep.equal({})
      })
      it("should follow relationships data (single item)", function() {
        jm = jsonapiModule(api, { 'follow_relationships_data': true })
        const { get } = jm.getters
        const result = get(store_record, { 'get': get })('widget/1')
        expect(norm_widget_1_rels).to.deep.equal(result)
      })
      it("should follow relationships data (array)", function() {
        jm = jsonapiModule(api, { 'follow_relationships_data': true })
        const { get } = jm.getters
        const result = get(store_record, { 'get': get })('widget/2')
        expect(norm_widget_2_rels).excludingEvery('_jv').to.deep.equal(result)
      })
      it("should follow relationships data (array) for a collection", function() {
        jm = jsonapiModule(api, { 'follow_relationships_data': true })
        const { get } = jm.getters
        const result = get(store_record, { 'get': get })('widget')
        expect(norm_record_rels).excludingEvery('_jv').to.deep.equal(result)
      })
    })

    describe("status", function() {
      it("should return the status for a given id", function() {
        const { status } = jm.getters
        let state = { '_jv': { 1: { 'status': 'splat' }}}
        const result = status(state)(1)
        expect(result).to.equal('splat')
      })
      it("should return the status for a given action (promise)", function() {
        const { status } = jm.getters
        let state = { '_jv': { 1: { 'status': 'splat' }}}
        const result = status(state)({ '_jv_id': 1 })
        expect(result).to.equal('splat')
      })
    })
  }); // getters

  describe("Custom Exceptions", function() {

    describe("RecordError", function() {
      it("Should have a message and object", function() {
        const msg = "hello"
        const obj = { invalid: "json" }
        const exc = new _testing.RecordError(msg, obj)
        expect(exc.message).to.equal(msg)
        expect(exc.value).to.equal(obj)
      })
    })
  }) // Exceptions

});
