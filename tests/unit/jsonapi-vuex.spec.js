import chai, { expect } from 'chai';
import chaiAsPromised from 'chai-as-promised';
import { _testing, jsonapiModule } from '../../src/jsonapi-vuex.js';
import axios from 'axios';
import MockAdapter from 'axios-mock-adapter';
import sinonChai from 'sinon-chai';

chai.use(sinonChai)
chai.use(chaiAsPromised)

// 'global' variables (redefined in beforeEach)
var jm, clock,
 json_widget_1, json_widget_2, json_widget_3, json_machine_1, json_widget_1_patch, json_record, meta,
 norm_widget_1, norm_widget_2, norm_widget_3, norm_machine_1, norm_widget_1_3,
 norm_widget_1_rels, norm_widget_2_rels, norm_widget_3_rels, norm_widget_1_patch, norm_widget_1_update,
 norm_record, norm_record_rels,
 store_widget_1, store_widget_1_update, store_widget_2, store_widget_3, store_widget_1_3, store_record

// Mock up a fake axios-like api instance
const api = axios.create({ baseURL: '' })

let mock_api = new MockAdapter(api);

// Stub the context's commit function to evaluate calls to it.
const stub_context = {
  getters: {
    get: sinon.stub().returns({})
  },
  commit: sinon.stub(),
  // Mock up dispatch('get')
  dispatch: (method, data) => {
    return new Promise(function(resolve) {
      if (method == 'get') {
        let id
        if (typeof(data) === 'string') {
          id = data.replace(/^\//, "").split('/')[1]
        } else {
          id = data['_jv']['id']
        }
        if (id === '1') {
          resolve(norm_widget_1)
        } else if (id === '2') {
          resolve(norm_widget_2)
        } else if (id === '3'){
          resolve(norm_widget_3)
        }
      }
    })
  }
}


beforeEach(() =>  {

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


  // Data in JSONAPI JSON form

  json_widget_1 = {
    id: '1',
    type: 'widget',
    attributes: {
      'foo': 1,
      'bar': 'baz'
    },
    relationships: {
      'widgets': {
        'data': {
          'type': 'widget',
          'id': '2'
        },
        'links': {
          'related': '/widget/1/widgets'
        }
      }
    }
  }

  json_widget_2 = {
    id: '2',
    type: 'widget',
    attributes: {
      'foo': 2
    },
    'relationships': {
      'widgets': {
        'data': [
          {
            'type': 'widget',
            'id': '1'
          },
          {
            'type': 'widget',
            'id': '3'
          }
        ]
      }
    }
  }

  json_widget_3 = {
    id: '3',
    type: 'widget',
    attributes: {
      'foo': 3
    },
    'relationships': {
      'widgets': {
        'data': {
          'type': 'widget',
          'id': '1'
        }
      }
    }
  }

  json_machine_1 = {
    id: '1',
    type: 'machine',
    attributes: {
      'foo': 1
    }
  }

  json_widget_1_patch = {
    id: '1',
    type: 'widget',
    attributes: {
      'foo': 'update',
      'bar': 'baz'
    },
    relationships: {
      'widgets': {
        'data': {
          'type': 'widget',
          'id': '2'
        },
        'links': {
          'related': '/widget/1/widgets'
        }
      }
    }
  }

  json_record = {
    data: [
      json_widget_1, json_widget_2, json_widget_3
    ]
  }


  // META only data
  meta = { 'meta': { 'token': 123456 }}


  // Data in Normalised/Restructured form

  norm_widget_1 = {
    'foo': 1,
    'bar': 'baz',
    '_jv': {
      'type': 'widget',
      'id': '1',
      'relationships': {
        'widgets': {
          'data': {
            'type': 'widget',
            'id': '2'
          },
          'links': {
            'related': '/widget/1/widgets'
          }
        }
      }
    }
  }

  norm_widget_1_patch = {
    'foo': 'update',
    '_jv': {
      'type': 'widget',
      'id': '1'
    }
  }

  norm_widget_1_update = {
    'foo': 'update',
    'bar': 'baz',
    '_jv': {
      'type': 'widget',
      'id': '1',
      'relationships': {
        'widgets': {
          'data': {
            'type': 'widget',
            'id': '2'
          },
          'links': {
            'related': '/widget/1/widgets'
          }
        }
      }
    }
  }

  norm_widget_2 = {
    'foo': 2,
    '_jv': {
      'type': 'widget',
      'id': '2',
      'relationships': {
        'widgets': {
          'data': [
            {
              'type': 'widget',
              'id': '1'
            },
            {
              'type': 'widget',
              'id': '3'
            }
          ]
        }
      }
    }
  }

  norm_widget_3 = {
    'foo': 3,
    '_jv': {
      'type': 'widget',
      'id': '3',
      'relationships': {
        'widgets': {
          'data': {
            'type': 'widget',
            'id': '1'
          }
        }
      }
    }
  }

  norm_machine_1 = {
    'foo': 1,
    '_jv': {
      'type': 'machine',
      'id': '1'
    }
  }

  norm_widget_1_3 = {
    '1': norm_widget_1,
    '3': norm_widget_3
  }

  // Copy norm_widget_* and add expanded rels
  norm_widget_1_rels = JSON.parse(JSON.stringify(norm_widget_1))
  norm_widget_2_rels = JSON.parse(JSON.stringify(norm_widget_2))
  norm_widget_3_rels = JSON.parse(JSON.stringify(norm_widget_3))
  norm_widget_1_rels['_jv']['rels'] = { 'widgets': norm_widget_2 }
  norm_widget_2_rels['_jv']['rels'] = { 'widgets': norm_widget_1_3 }
  norm_widget_3_rels['_jv']['rels'] = { 'widgets': norm_widget_1 }

  norm_record = {
    [norm_widget_1['_jv']['id']]: norm_widget_1,
    [norm_widget_2['_jv']['id']]: norm_widget_2,
    [norm_widget_3['_jv']['id']]: norm_widget_3
  }

  norm_record_rels = {
    [norm_widget_1['_jv']['id']]: norm_widget_1_rels,
    [norm_widget_2['_jv']['id']]: norm_widget_2_rels,
    [norm_widget_3['_jv']['id']]: norm_widget_3_rels
  }


  // Data in Store form

  store_widget_1 = {
    'widget':{
      '1': {
        ...norm_widget_1
      }
    }
  }

  store_widget_2 = {
    'widget':{
      '2': {
        ...norm_widget_2
      }
    }
  }

  store_widget_3 = {
    'widget':{
      '3': {
        ...norm_widget_3
      }
    }
  }

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

  store_record = {
    'widget': {
      ...store_widget_1['widget'],
      ...store_widget_2['widget'],
      ...store_widget_3['widget']
    }
  }

})

afterEach(() => {

  // Undo fake timers
  clock = sinon.restore()

})

describe("jsonapi-vuex tests", () =>  {

  it("should export jsonapiModule", () =>  {
    expect(jsonapiModule).to.exist;
  });

  describe("config handling", () => {
    it("Should override default config", () => {
      const conf = { 'jvtag': '_splat' }
      const { jvConfig } = _testing
      jm = jsonapiModule(api, conf)
      expect(jvConfig['jvtag']).to.equal('_splat')
    })
  });

  describe("jsonapiModule actions", () =>  {

    describe("get", () =>  {
      it("should make an api call to GET item(s)", (done) => {
        mock_api.onAny().reply(200, { data: json_widget_1 })
        let action = jm.actions.get(stub_context, norm_widget_1)
        action.then(() => {
            expect(mock_api.history.get[0].url).to.equal(`/${norm_widget_1['_jv']['type']}/${norm_widget_1['_jv']['id']}`)
            done()
          })
      })
      it("should make an api call to GET a collection", (done) => {
        mock_api.onAny().reply(200, { data: json_widget_1 })
        delete norm_widget_1['_jv']['id']
        jm.actions.get(stub_context, norm_widget_1)
          .then(() => {
            expect(mock_api.history.get[0].url).to.equal(`/${norm_widget_1['_jv']['type']}`)
            done()
          })
      })
      it("should accept axios config as the 2nd arg in a list", (done) => {
        mock_api.onAny().reply(200, { data: json_widget_1 })
        const params = { filter: "color" }
        jm.actions.get(stub_context, [ norm_widget_1, { params: params } ])
          .then(() => {
            expect(mock_api.history.get[0].params).to.equal(params)
            done()
          })
      })
      it("should add record(s) in the store", (done) => {
        mock_api.onAny().reply(200, { data: json_widget_1 })
        jm.actions.get(stub_context, norm_widget_1)
          .then(() => {
            expect(stub_context.commit).to.have.been.calledWith("add_records", norm_widget_1)
            done()
          })
      })
      it("should add record(s) (string) in the store", (done) =>  {
        mock_api.onAny().reply(204)
        // Leading slash is incorrect syntax, but we should handle it so test with it in
        jm.actions.get(stub_context, "/widget/1")
          .then(() => {
            expect(stub_context.commit).to.have.been.calledWith("add_records", norm_widget_1)
            done()
          })
      })
      it("should return normalized data", (done) => {
        mock_api.onAny().reply(200, { data: json_widget_1 })
        jm.actions.get(stub_context, norm_widget_1)
          .then((res) => {
            expect(res).to.deep.equal(norm_widget_1)
            done()
          })
      })
      it("should add included record(s) to the store", (done) => {
        // included array can include objects from different collections
        const data = {
          data: json_widget_1,
          included: [ json_widget_2, json_machine_1 ]
        }
        mock_api.onAny().reply(200, data)
        // for a real API call, would need axios include params here
        jm.actions.get(stub_context, norm_widget_1)
          .then(() => {
            expect(stub_context.commit).to.have.been.calledWith("add_records", norm_widget_2)
            expect(stub_context.commit).to.have.been.calledWith("add_records", norm_machine_1)
            done()
          })
      })
      it("should return normalized data with expanded rels (single item)", (done) => {
        jm = jsonapiModule(api, { 'follow_relationships_data': true })
        // Make state contain all records for rels to work
        stub_context['state'] = store_record
        mock_api.onAny().reply(200, { data: json_widget_1 })
        jm.actions.get(stub_context, norm_widget_1)
          .then((res) => {
            expect(res).to.deep.equal(norm_widget_1_rels)
            done()
          })
      })
      it("should return normalized data with expanded rels (array)", (done) => {
        jm = jsonapiModule(api, { 'follow_relationships_data': true })
        // Make state contain all records for rels to work
        stub_context['state'] = store_record
        mock_api.onAny().reply(200, json_record)
        jm.actions.get(stub_context, "widget")
          .then((res) => {
            expect(res).to.deep.equal(norm_record_rels)
            done()
          })
      })
      it("should handle an empty rels 'data' object", (done) => {
        jm = jsonapiModule(api, { 'follow_relationships_data': true })
        // Delete contents of data and remove links
        json_widget_1['relationships']['widgets']['data'] = {}
        delete json_widget_1['relationships']['widgets']['links']
        mock_api.onAny().reply(200, { data: json_widget_1 })
        jm.actions.get(stub_context, norm_widget_1)
          .then((res) => {
            expect(res['_jv']['rels']['widgets']).to.deep.equal({})
            done()
          })
      })
      it("should preserve json in _jv in returned data", (done) => {
        jm = jsonapiModule(api, { 'preserve_json': true })
        // Mock server to only return a meta section
        mock_api.onAny().reply(200, meta)
        jm.actions.get(stub_context, "widget")
          .then((res) => {
            // json should now be nested in _jv/json
            expect(res['_jv']['json']).to.deep.equal(meta)
            done()
          })
      })
      it("should not preserve json in _jv in returned data", (done) => {
        jm = jsonapiModule(api, { 'preserve_json': false })
        // Mock server to only return a meta section
        mock_api.onAny().reply(200, meta)
        jm.actions.get(stub_context, "widget")
          .then((res) => {
            // collections should have no top-level _jv
            expect(res).to.not.have.key('_jv')
            done()
          })
      })
      it("should handle API errors", (done) => {
        mock_api.onAny().reply(500)
        jm.actions.get(stub_context, norm_widget_1)
          .then(res => {
            expect(res.response.status).to.equal(500)
            done()
          })
      }),
      it("should have an associated action id", () => {
        mock_api.onAny().reply(200, { data: json_widget_1 })
        let action = jm.actions.get(stub_context, norm_widget_1)
        expect(action).to.have.property('_jv_id')
      })
    })

    describe("fetch", () => {
      it("should be an alias for get", () => {
        expect(jm.actions.fetch).to.equal(jm.actions.get)
      })
    })

    describe("getRelated", () =>{
      it("Should throw an error if passed an object with no id", (done) => {
        delete norm_widget_1['_jv']['id']
        // Wrap method in an empty method to catch transpiled throw (https://www.chaijs.com/api/bdd/#method_throw)
        expect(() => jm.actions.getRelated(stub_context, norm_widget_1)).to.throw("No id specified")
        done()
      })
      it("should get a record's single related item (using 'data')", (done) => {
        jm.actions.getRelated(stub_context, norm_widget_1)
          .then(res => {
            expect(res).to.deep.equal({ 'widgets' : store_widget_2 })
            done()
          })
      })
      it("should get a record's related items (using 'data')", (done) => {
        jm.actions.getRelated(stub_context, norm_widget_2)
          .then(res => {
            expect(res).to.deep.equal({ 'widgets': store_widget_1_3 })
            done()
          })
      })
      it("should get a record's related items (using 'links' string)", (done) => {
        // Remove data so it will fallback to using links
        delete norm_widget_1['_jv']['relationships']['widgets']['data']
        mock_api.onAny().reply(200, { data: json_widget_2 })
        jm.actions.getRelated(stub_context, norm_widget_1)
          .then(res => {
            expect(res).to.deep.equal({ 'widgets': store_widget_2 })
            done()
          })
      })
      it("should get a record's related items (using 'links' object)", (done) => {
        // Remove data so it will fallback to using links
        delete norm_widget_1['_jv']['relationships']['widgets']['data']
        // Replace links string with links object
        norm_widget_1['_jv']['relationships']['widgets']['links']['related'] = { 'href': 'widget/1/widgets' }
        mock_api.onAny().reply(200, { data: json_widget_2 })
        jm.actions.getRelated(stub_context, norm_widget_1)
          .then(res => {
            expect(res).to.deep.equal({ 'widgets': store_widget_2 })
            done()
          })
      })
      it("should get a record's related items (string path)", (done) => {
        jm.actions.getRelated(stub_context, "widget/2")
          .then(res => {
            expect(res).to.deep.equal({ 'widgets': store_widget_1_3 })
            done()
          })
      })
      it("should return related data for a specific relname", (done) => {
        jm.actions.getRelated(stub_context, "widget/3/widgets")
          .then((res) => {
            expect(res).to.deep.equal({ 'widgets': store_widget_1 })
            done()
          })
      })
      it("should have an associated action id", () => {
        mock_api.onAny().reply(200, { data: json_widget_1 })
        let action = jm.actions.getRelated(stub_context, "widget/2")
        expect(action).to.have.property('_jv_id')
      })
    })

    describe("post", () =>  {
      it("should make an api call to POST item(s)", (done) => {
        mock_api.onAny().reply(201, { data: json_widget_1 })
        jm.actions.post(stub_context, norm_widget_1)
          .then(() => {
            expect(mock_api.history.post[0].url).to.equal(`/${norm_widget_1['_jv']['type']}`)
            done()
          })
      })
      it("should accept axios config as the 2nd arg in a list", (done) => {
        mock_api.onAny().reply(201, { data: json_widget_1 })
        const params = { filter: "color" }
        jm.actions.post(stub_context, [ norm_widget_1, { params: params } ])
          .then(() => {
            expect(mock_api.history.post[0].params).to.equal(params)
            done()
          })
      })
      it("should add record(s) to the store", (done) => {
        mock_api.onAny().reply(201, { data: json_widget_1 })
        jm.actions.post(stub_context, norm_widget_1)
          .then(() => {
            expect(stub_context.commit).to.have.been.calledWith("add_records", norm_widget_1)
            done()
          })
      })
      it("should add record(s) in the store (no server response)", (done) => {
        mock_api.onAny().reply(204)
        jm.actions.post(stub_context, norm_widget_1)
          .then(() => {
            expect(stub_context.commit).to.have.been.calledWith("add_records", norm_widget_1)
            done()
          })
      })
      it("should return data via the 'get' getter", (done) => {
        mock_api.onAny().reply(201, { data: json_widget_1 })
        jm.actions.post(stub_context, norm_widget_1)
          .then(() => {
              expect(stub_context.getters.get).to.have.been.calledWith(norm_widget_1)
            done()
          })
      })
      it("should POST data", (done) => {
        mock_api.onAny().reply(201, { data: json_widget_1 })
        jm.actions.post(stub_context, norm_widget_1)
          .then(() => {
            // History stores data as JSON string, so parse back to object
            expect(JSON.parse(mock_api.history.post[0].data)).to.deep.equal({ data: json_widget_1 })
            done()
          })
      })
      it("should preserve json in _jv in returned data", (done) => {
        jm = jsonapiModule(api, { 'preserve_json': true })
        // Mock server data to include a meta section
        mock_api.onAny().reply(201, { data: json_widget_1, ...meta })
        jm.actions.post(stub_context, norm_widget_1)
          .then((res) => {
            // json should now be nested in _jv/json
            expect(res['_jv']['json']).to.deep.equal(meta)
            done()
          })
      })
      it("should handle API errors", (done) => {
        mock_api.onAny().reply(500)
        jm.actions.post(stub_context, norm_widget_1)
          .then(res => {
            expect(res.response.status).to.equal(500)
            done()
          })
      }),
      it("should have an associated action id", () => {
        mock_api.onAny().reply(200, { data: json_widget_1 })
        let action = jm.actions.post(stub_context, norm_widget_1)
        expect(action).to.have.property('_jv_id')
      })
    })

    describe("create", () => {
      it("should be an alias for post", () => {
        expect(jm.actions.create).to.equal(jm.actions.post)
      })
    })

    describe("patch", () =>  {
      it("should make an api call to PATCH item(s)", (done) => {
        mock_api.onAny().reply(200, { data: json_widget_1 })
        jm.actions.patch(stub_context, norm_widget_1_patch)
          .then(() => {
            expect(mock_api.history.patch[0].url).to.equal(`/${norm_widget_1_patch['_jv']['type']}/${norm_widget_1_patch['_jv']['id']}`)
            done()
          })
      })
      it("should accept axios config as the 2nd arg in a list", (done) => {
        mock_api.onAny().reply(200, { data: json_widget_1 })
        const params = { filter: "color" }
        jm.actions.patch(stub_context, [ norm_widget_1_patch, { params: params } ])
          .then(() => {
            expect(mock_api.history.patch[0].params).to.equal(params)
            done()
          })
      })
      it("should delete then add record(s) in the store (from server response)", (done) => {
        mock_api.onAny().reply(200,  { data: json_widget_1_patch })
        jm.actions.patch(stub_context, norm_widget_1_patch)
          .then(() => {
            expect(stub_context.commit).to.have.been.calledWith("delete_record", norm_widget_1_patch)
            expect(stub_context.commit).to.have.been.calledWith("add_records", norm_widget_1_update)
            done()
          })
      })
      it("should update record(s) in the store (no server response)", (done) => {
        mock_api.onAny().reply(204)
        jm.actions.patch(stub_context, norm_widget_1_patch)
          .then(() => {
            expect(stub_context.commit).to.have.been.calledWith("update_record", norm_widget_1_patch)
            done()
          })
      })
      it("should return data via the 'get' getter", (done) => {
        mock_api.onAny().reply(200, { data: json_widget_1 })
        jm.actions.patch(stub_context, norm_widget_1_patch)
          .then(() => {
              expect(stub_context.getters.get).to.have.been.calledWith(norm_widget_1)
            done()
          })
      })
      it("should preserve json in _jv in returned data", (done) => {
        jm = jsonapiModule(api, { 'preserve_json': true })
        // Mock server data to include a meta section
        mock_api.onAny().reply(200, { data: json_widget_1, ...meta })
        jm.actions.patch(stub_context, norm_widget_1_patch)
          .then((res) => {
            // json should now be nested in _jv/json
            expect(res['_jv']['json']).to.deep.equal(meta)
            done()
          })
      })
      it("should handle API errors", (done) => {
        mock_api.onAny().reply(500)
        jm.actions.patch(stub_context, norm_widget_1)
          .then(res => {
            expect(res.response.status).to.equal(500)
            done()
          })
      }),
      it("should have an associated action id", () => {
        mock_api.onAny().reply(200, { data: json_widget_1 })
        let action = jm.actions.patch(stub_context, norm_widget_1)
        expect(action).to.have.property('_jv_id')
      })
    })

    describe("update", () => {
      it("should be an alias for patch", () => {
        expect(jm.actions.update).to.equal(jm.actions.patch)
      })
    })

    describe("delete", () =>  {
      it("should make an api call to DELETE item(s)", (done) => {
        mock_api.onAny().reply(204)
        jm.actions.delete(stub_context, norm_widget_1)
          .then(() => {
            expect(mock_api.history.delete[0].url).to.equal(`/${norm_widget_1['_jv']['type']}/${norm_widget_1['_jv']['id']}`)
            done()
          })
      })
      it("should accept axios config as the 2nd arg in a list", (done) => {
        mock_api.onAny().reply(200, { data: json_widget_1 })
        const params = { filter: "color" }
        jm.actions.delete(stub_context, [ norm_widget_1, { params: params } ])
          .then(() => {
            expect(mock_api.history.delete[0].params).to.equal(params)
            done()
          })
      })
      it("should delete a record from the store", (done) => {
        mock_api.onAny().reply(204)
        jm.actions.delete(stub_context, norm_widget_1)
          .then(() => {
            expect(stub_context.commit).to.have.been.calledWith("delete_record", norm_widget_1)
            done()
          })
      })
      it("should delete a record (string) from the store", (done) =>  {
        mock_api.onAny().reply(204)
        // Leading slash is incorrect syntax, but we should handle it so test with it in
        jm.actions.delete(stub_context, "/widget/1")
          .then(() => {
            expect(stub_context.commit).to.have.been.calledWith("delete_record", norm_widget_1)
            done()
          })
      })
      it("should return deleted object if passed back by server", (done) =>  {
        mock_api.onAny().reply(200, { data: json_widget_1 })
        // Leading slash is incorrect syntax, but we should handle it so test with it in
        jm.actions.delete(stub_context, norm_widget_1)
          .then((res) => {
            expect(res).to.deep.equal(norm_widget_1)
            done()
          })
      })
      it("should handle API errors", (done) => {
        mock_api.onAny().reply(500)
        jm.actions.delete(stub_context, norm_widget_1)
          .then(res => {
            expect(res.response.status).to.equal(500)
            done()
          })
      }),
      it("should have an associated action id", () => {
        mock_api.onAny().reply(200, { data: json_widget_1 })
        let action = jm.actions.delete(stub_context, norm_widget_1)
        expect(action).to.have.property('_jv_id')
      })
    })
  });

  describe("jsonapiModule mutations", () =>  {

    describe("delete_record", () =>  {
      it("should delete a record (data) from the Vue store", () =>  {
        const { delete_record } = jm.mutations
        delete_record(store_widget_1, norm_widget_1)
        expect(store_widget_1[norm_widget_1['_jv']['type']]).to.not.have.key(norm_widget_1['_jv']['id'])
      })
      it("should delete a record (string) from the store", () =>  {
        const { delete_record } = jm.mutations
        // Leading slash is incorrect syntax, but we should handle it so test with it in
        delete_record(store_widget_1, "/widget/1")
        expect(store_widget_1[norm_widget_1['_jv']['type']]).to.not.have.key(norm_widget_1['_jv']['id'])
    })
      it("should throw an error if no type or id present.", () => {
        const { delete_record } = jm.mutations
        // expect needs a function to call, not the return from a function
        expect(() => delete_record(store_widget_1, { '_jv': {}})).to.throw(_testing.RecordError)
      })
    })

    describe("add_records", () => {
      it("should add several records to the store", () => {
        const { add_records } = jm.mutations
        const state = {}
        add_records(state, norm_record)
        expect(state).to.deep.equal(store_record)
      })
    })

    describe("update_record", () => {
      it("should update a specific attribute of a record already in the store", () => {
        const { update_record } = jm.mutations
        update_record(store_widget_1, norm_widget_1_patch)
        expect(store_widget_1).to.deep.equal(store_widget_1_update)
      })
      it("should throw an error if no type or id present.", () => {
        const { update_record } = jm.mutations
        // expect needs a function to call, not the return from a function
        expect(() => update_record(store_widget_1, { '_jv': {}})).to.throw(_testing.RecordError)
      })
    }),

    describe("set_status", () => {
      it("should set the status for a specific id", () => {
        const state = { '_jv': {}}
        const { set_status } = jm.mutations
        set_status(state, { id: 2, status: 'splat' })
        expect(state['_jv'][2]).to.have.keys([ 'status', 'time' ])
      })
    })
  })

  describe("jsonapiModule helpers", () =>  {
    describe("getTypeId", () => {
      it("should get type & id from string", () => {
        const { getTypeId } = _testing
        expect(getTypeId("widget/1")).to.deep.equal([ 'widget', '1' ])
      })
      it("should get type only from string", () => {
        const { getTypeId } = _testing
        expect(getTypeId("widget")).to.deep.equal([ 'widget' ])
      })
      it("should get type, id & relname from string", () => {
        const { getTypeId } = _testing
        expect(getTypeId("widget/1/relname")).to.deep.equal([ 'widget', '1', 'relname' ])
      })
      it("should get type & id from norm data", () => {
        const { getTypeId } = _testing
        expect(getTypeId(norm_widget_1)).to.deep.equal([ 'widget', '1' ])
      })
      it("should get type only from norm data", () => {
        const { getTypeId } = _testing
        delete norm_widget_1['_jv']['id']
        expect(getTypeId(norm_widget_1)).to.deep.equal([ 'widget' ])
      })
    })

    describe("jsonapiToNormItem", () =>  {
      it("should convert jsonapi to normalized for a single item", () =>  {
        const { jsonapiToNormItem } = _testing
        expect(jsonapiToNormItem(json_widget_1)).to.deep.equal(norm_widget_1)
      });
      it("should preserve deeply nested '_jv' keys", () =>  {
        const { jsonapiToNormItem } = _testing
        expect(jsonapiToNormItem(json_widget_1)).to.deep.equal(norm_widget_1)
      });
    })

    describe("jsonapiToNorm", () =>  {
      it("should convert jsonapi to normalized for a single item", () =>  {
        const { jsonapiToNorm } = _testing
        expect(jsonapiToNorm(json_widget_1)).to.deep.equal(norm_widget_1)
      });

      it("should convert jsonapi to normalized for an array of records", () =>  {
        const { jsonapiToNorm } = _testing
        expect(jsonapiToNorm(json_record['data'])).to.deep.equal(norm_record)
      });

      it("should return an empty object if input is undefined", () =>  {
        const { jsonapiToNorm } = _testing
        expect(jsonapiToNorm(undefined)).to.deep.equal({})
      })
    });

    describe("normToJsonapi", () =>  {
      it("should convert normalized to jsonapi for multiple items", () =>  {
        const { normToJsonapi } = _testing
        expect(normToJsonapi(norm_record)).to.deep.equal(json_record)
      });

      it("should convert normalized to jsonapi for a single item", () =>  {
        const { normToJsonapi } = _testing
        expect(normToJsonapi(norm_widget_1)).to.deep.equal({ data: json_widget_1 })
      });
    });

    describe("normToJsonapiItem", () => {
      it("should convert normalized to jsonapi for a single item", () =>  {
        const { normToJsonapiItem } = _testing
        expect(normToJsonapiItem(norm_widget_1)).to.deep.equal(json_widget_1)
      });
      it("should convert normalized to jsonapi for a single item with no id (POST)", () =>  {
        const { normToJsonapiItem } = _testing
        delete norm_widget_1['_jv']['id']
        delete json_widget_1['id']
        expect(normToJsonapiItem(norm_widget_1)).to.deep.equal(json_widget_1)
      });
    })

    describe("normToStore", () => {
      it("should convert normalized to store", () => {
        const { normToStore } = _testing
        expect(normToStore(norm_record)).to.deep.equal(store_record)
      })
      it("should convert normalized to store for a single item", () => {
        const { normToStore } = _testing
        expect(normToStore(norm_widget_1)).to.deep.equal(store_widget_1)
      })
    })
    describe("unpackArgs", () => {
      it("Should convert a single arg into an array with empty config", () => {
        const { unpackArgs } = _testing
        expect(unpackArgs('splat')).to.deep.equal([ 'splat', {} ])
      })
      it("Should leave an args array as-is", () => {
        const { unpackArgs } = _testing
        expect(unpackArgs([ 'splat', {} ])).to.deep.equal([ 'splat', {} ])
      })
    })

    describe("followRelationships", () => {
      it("Should expand relationships into rels for a single item", () => {
        const { followRelationships } = _testing
        let rels = followRelationships(store_record, norm_widget_1)['_jv']['rels']['widgets']
        expect(rels).to.deep.equal(norm_widget_2)
      })
    })

    describe("actionStatusClean", () => {
      it("Should be called via setInterval", () => {
        // Set an interval of 10 seconds
        const interval = 10
        // Spy on the fake clock's setInterval method
        let spy = sinon.spy(clock, 'setInterval')
        jm = jsonapiModule(api, { 'action_status_clean_interval': interval })
        // Simulate time passing (1ms more than interval)
        clock.tick(interval * 1000 + 1)
        // Check that called with interval set correctly
        expect(spy.firstCall.args[1]).to.equal(interval * 1000)
      })
      it("Should not be called is interval is 0", () => {
        // Set an interval of 0 seconds = disable
        const interval = 0
        // Spy on the fake clock's setInterval method
        let spy = sinon.spy(clock, 'setInterval')
        jm = jsonapiModule(api, { 'action_status_clean_interval': interval })
        // Simulate time passing
        clock.tick(10000)
        // Check that never called
        expect(spy).to.not.have.been.called
      })
      it("Should remove an expired record, but not an unexpired one", () => {
        let { actionStatusClean, jvConfig } = _testing
        jvConfig['action_status_clean_age'] = 10
        //jm = jsonapiModule(api, { 'action_status_clean_age': 10 })
        let state = {
          _jv: {
            1: {
              status: 'SUCCESS',
              time: 0
            },
            2: {
              status: 'SUCCESS',
              time: 9000
            }
          }
        }
        clock.tick(11000)
        actionStatusClean(state)
        expect(state['_jv']).to.have.key(2).and.not.have.key(1)
      })
    })
  }); // Helper methods

  describe("jsonapiModule getters", () =>  {

    describe("get", () => {
      it("should return all state", () => {
        const { get } = jm.getters
        const result = get(store_record)()
        expect(result).to.deep.equal(store_record)
      })
      it("should return all state for a single endpoint", () => {
        const { get } = jm.getters
        const result = get(store_record)({ '_jv': { 'type': 'widget' }})
        expect(result).to.deep.equal(norm_record)
      })
      it("should return all state for a single endpoint with a single record", () => {
        const { get } = jm.getters
        const result = get(store_widget_1)({ '_jv': { 'type': 'widget' }})
        expect(result).to.deep.equal(store_widget_1['widget'])
      })
      it("should return a single id from state", () => {
        const { get } = jm.getters
        const result = get(store_widget_1)({ '_jv': { 'type': 'widget', 'id': '1' }})
        expect(result).to.deep.equal(norm_widget_1)
      })
      it("should accept a string path to object", () => {
        const { get } = jm.getters
        const result = get(store_widget_1)('widget/1')
        expect(result).to.deep.equal(norm_widget_1)
      })
      it("should filter results using jsonpath, returning a single item", () => {
        const { get } = jm.getters
        const result = get(store_record)('widget', '$[?(@.bar=="baz")]')
        expect(result).to.deep.equal({ [norm_widget_1['_jv']['id']] : norm_widget_1 })
      })
      it("should filter results using jsonpath, returning multiple items", () => {
        const { get } = jm.getters
        const result = get(store_record)('widget', '$[?(@.foo)]')
        expect(result).to.deep.equal(norm_record)
      })
      it("should filter results using jsonpath, returning no items", () => {
        const { get } = jm.getters
        const result = get(store_record)('widget', '$[?(@.nosuchkey)]')
        expect(result).to.deep.equal({})
      })
      it("should return empty object if type not in state", () => {
        const { get } = jm.getters
        const result = get({})('widget')
        expect(result).to.deep.equal({})
      })
      it("should follow relationships data (single item)", () => {
        jm = jsonapiModule(api, { 'follow_relationships_data': true })
        const { get } = jm.getters
        const result = get(store_record, { 'get': get })('widget/1')
        expect(norm_widget_1_rels).to.deep.equal(result)
      })
      it("should follow relationships data (array)", () => {
        jm = jsonapiModule(api, { 'follow_relationships_data': true })
        const { get } = jm.getters
        const result = get(store_record, { 'get': get })('widget/2')
        expect(norm_widget_2_rels).to.deep.equal(result)
      })
      it("should follow relationships data (array) for a collection", () => {
        jm = jsonapiModule(api, { 'follow_relationships_data': true })
        const { get } = jm.getters
        const result = get(store_record, { 'get': get })('widget')
        expect(norm_record_rels).to.deep.equal(result)
      })
    })

    describe("status", () => {
      it("should return the status for a given id", () => {
        const { status } = jm.getters
        let state = { '_jv': { 1: { 'status': 'splat' }}}
        const result = status(state)(1)
        expect(result).to.equal('splat')
      }),
      it("should return the status for a given action (promise)", () => {
        const { status } = jm.getters
        let state = { '_jv': { 1: { 'status': 'splat' }}}
        const result = status(state)({ '_jv_id': 1 })
        expect(result).to.equal('splat')
      })
    })
  }); // getters

  describe("Custom Exceptions", () =>  {

    describe("RecordError", () => {
      it("Should have a message and object", () => {
        const msg = "hello"
        const obj = { invalid: "json" }
        const exc = new _testing.RecordError(msg, obj)
        expect(exc.message).to.equal(msg)
        expect(exc.value).to.equal(obj)
      })
    })
  }) // Exceptions

});
