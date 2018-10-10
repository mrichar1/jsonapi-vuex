import chai, {expect} from 'chai';
import { _testing, jsonapiModule } from '../src/jsonapi-vuex.js';
import axios from 'axios';
import MockAdapter from 'axios-mock-adapter';
import sinonChai from 'sinon-chai';

chai.use(sinonChai)

// 'global' variables (redefined in beforeEach)
var jm,
 json_item1, json_item2, json_record,
 norm_item1, norm_item2, norm_item1_patch, norm_item1_update, norm_record, norm_state,
 store_item1, store_item1_update, store_record

// Mock up a fake axios-like api instance
const api = axios.create({ baseURL: 'http://example.com'})

let mock_api = new MockAdapter(api);

// Stub the context's commit function to evaluate calls to it.
const stub_context = {
  commit: sinon.stub()
}


beforeEach(() =>  {
// Set up commonly used data objects

  mock_api.reset()
  jm = jsonapiModule(api)

  json_item1 = {
    id: '1',
    type: 'widget',
    attributes: {
      'foo': 1,
      'bar': 'baz'
    }
  }

  json_item2 = {
    id: '2',
    type: 'widget',
    attributes: {
      'foo': 2
    }
  }

  norm_item1 = {
    'foo': 1,
    'bar': 'baz',
    '_jv': {
      'type': 'widget',
      'id': '1'
    }
  }

  norm_item1_patch = {
    'foo': 'update',
    '_jv': {
      'type': 'widget',
      'id': '1'
    }
  }

  norm_item1_update = {
    'foo': 'update',
    'bar': 'baz',
    '_jv': {
      'type': 'widget',
      'id': '1'
    }
  }

  norm_item2 = {
    'foo': 2,
    '_jv': {
      'type': 'widget',
      'id': '2'
    }
  }

  json_record = [
    json_item1, json_item2
  ]

  norm_record = {
    [norm_item1['_jv']['id']]: norm_item1,
    [norm_item2['_jv']['id']]: norm_item2
  }

  norm_state = {
    'widget': {
      ...norm_record
    }
  }

  store_item1 = {
    'widget':{
      '1': {
        ...norm_item1
      }
    }
  }

  store_item1_update = {
    'widget': {
      '1': {
        ...norm_item1_update
      }
    }
  }

  store_record = {
    'widget': {
      '1': {
        ...norm_item1
      },
      '2': {
        ...norm_item2
      }
    }
  }

})

describe("jsonapi-vuex tests", () =>  {

  it("should export jsonapiModule", () =>  {
    expect(jsonapiModule).to.exist;
  });

  describe("jsonapiModule actions", () =>  {

    it("should export actions", () =>  {
      expect(_testing.actions).to.be.a('function');
    });

    describe("get", () =>  {
      it("should make an api call to GET item(s)", (done) => {
        mock_api.onAny().reply(200, {data: json_item1})
        jm.actions.get(stub_context, norm_item1)
          .then(() => {
            expect(mock_api.history.get[0].url).to.equal(`/${norm_item1['_jv']['type']}/${norm_item1['_jv']['id']}`)
            done()
          })
      })
      it("should update record(s) in the store", (done) => {
        mock_api.onAny().reply(200, {data: json_item1})
        jm.actions.get(stub_context, norm_item1)
          .then(() => {
            expect(stub_context.commit).to.have.been.calledWith("update_record", norm_item1)
            done()
          })
      })
      it("should update record(s) (string) in the store", (done) =>  {
        mock_api.onAny().reply(204)
        // Leading slash is incorrect syntax, but we should handle it so test with it in
        jm.actions.get(stub_context, "/widget/1")
          .then(() => {
            expect(stub_context.commit).to.have.been.calledWith("update_record", norm_item1)
            done()
          })
      })
      it("should handle API errors", (done) => {
        mock_api.onAny().reply(500)
        jm.actions.get(stub_context, norm_item1)
          .then(res => {
            expect(res.response.status).to.equal(500)
            done()
          })
      })
    })

    describe("fetch", () => {
      it("should be an alias for get", () => {
        expect(jm.actions.fetch).to.equal(jm.actions.get)
      })
    })

    describe("post", () =>  {
      it("should make an api call to POST item(s)", (done) => {
        mock_api.onAny().reply(200, {data: json_item1})
        jm.actions.post(stub_context, norm_item1)
          .then(() => {
            expect(mock_api.history.post[0].url).to.equal(`/${norm_item1['_jv']['type']}`)
            done()
          })
      })
      it("should add record(s) to the store", (done) => {
        mock_api.onAny().reply(200, {data: json_item1})
        jm.actions.post(stub_context, norm_item1)
          .then(() => {
            expect(stub_context.commit).to.have.been.calledWith("update_record", norm_item1)
            done()
          })
      })
      it("should POST data", (done) => {
        mock_api.onAny().reply(200, {data: json_item1})
        jm.actions.post(stub_context, norm_item1)
          .then(() => {
            // History stores data as JSON string, so parse back to object
            expect(JSON.parse(mock_api.history.post[0].data)).to.deep.equal(json_item1)
            done()
          })
      })
      it("should handle API errors", (done) => {
        mock_api.onAny().reply(500)
        jm.actions.post(stub_context, norm_item1)
          .then(res => {
            expect(res.response.status).to.equal(500)
            done()
          })
      })
    })

    describe("create", () => {
      it("should be an alias for post", () => {
        expect(jm.actions.create).to.equal(jm.actions.post)
      })
    })

    describe("patch", () =>  {
      it("should make an api call to PATCH item(s)", (done) => {
        mock_api.onAny().reply(200, {data: json_item1})
        jm.actions.patch(stub_context, norm_item1_patch)
          .then(() => {
            expect(mock_api.history.patch[0].url).to.equal(`/${norm_item1_patch['_jv']['type']}/${norm_item1_patch['_jv']['id']}`)
            done()
          })
      })
      it("should update record(s) in the store", (done) => {
        mock_api.onAny().reply(200, {data: json_item1})
        jm.actions.patch(stub_context, norm_item1_patch)
          .then(() => {
            expect(stub_context.commit).to.have.been.calledWith("update_record", norm_item1_patch)
            done()
          })
      })
      it("should handle API errors", (done) => {
        mock_api.onAny().reply(500)
        jm.actions.patch(stub_context, norm_item1)
          .then(res => {
            expect(res.response.status).to.equal(500)
            done()
          })
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
        jm.actions.delete(stub_context, norm_item1)
          .then(() => {
            expect(mock_api.history.delete[0].url).to.equal(`/${norm_item1['_jv']['type']}/${norm_item1['_jv']['id']}`)
            done()
          })
      })
      it("should delete a record from the store", (done) => {
        mock_api.onAny().reply(204)
        jm.actions.delete(stub_context, norm_item1)
          .then(() => {
            expect(stub_context.commit).to.have.been.calledWith("delete_record", norm_item1)
            done()
          })
      })
      it("should delete a record (string) from the store", (done) =>  {
        mock_api.onAny().reply(204)
        // Leading slash is incorrect syntax, but we should handle it so test with it in
        jm.actions.delete(stub_context, "/widget/1")
          .then(() => {
            expect(stub_context.commit).to.have.been.calledWith("delete_record", norm_item1)
            done()
          })
      })
      it("should handle API errors", (done) => {
        mock_api.onAny().reply(500)
        jm.actions.delete(stub_context, norm_item1)
          .then(res => {
            expect(res.response.status).to.equal(500)
            done()
          })
      })
    })
  });

  describe("jsonapiModule mutations", () =>  {
    it("should export mutations", () =>  {
      expect(_testing.mutations).to.be.a('function');
    });

    describe("delete_record", () =>  {
      it("should delete a record (data) from the Vue store", () =>  {
        const { delete_record } = jm.mutations
        delete_record(store_item1, norm_item1)
        expect(store_item1[norm_item1['_jv']['type']]).to.not.have.key(norm_item1['_jv']['id'])
      })
    })

    it("should delete a record (string) from the store", () =>  {
      const { delete_record } = jm.mutations
      // Leading slash is incorrect syntax, but we should handle it so test with it in
      delete_record(store_item1, "/widget/1")
      expect(store_item1[norm_item1['_jv']['type']]).to.not.have.key(norm_item1['_jv']['id'])
    })

    describe("update_record", () => {
      it("should add several records to the store", () => {
        const { update_record } = jm.mutations
        const state = {}
        update_record(state, norm_record)
        expect(state).to.deep.equal(store_record)
      })

      it("should update a specific attribute of a record already in the store", () => {
        const { update_record } = jm.mutations
        update_record(store_item1, norm_item1_patch)
        expect(store_item1).to.deep.equal(store_item1_update)
      })
    })
  });

  describe("jsonapiModule helpers", () =>  {
    describe("jsonapiToNormItem", () =>  {
      it("should convert jsonapi to normalized for a single item", () =>  {
        const { jsonapiToNormItem } = _testing
        expect(jsonapiToNormItem(json_item1)).to.deep.equal(norm_item1)
      });
    })

    describe("jsonapiToNorm", () =>  {
      it("should convert jsonapi to normalized for a single item", () =>  {
        const { jsonapiToNorm } = _testing
        expect(jsonapiToNorm(json_item1)).to.deep.equal(norm_item1)
      });

      it("should convert jsonapi to normalized for an array of records", () =>  {
        const { jsonapiToNorm } = _testing
        expect(jsonapiToNorm(json_record)).to.deep.equal(norm_record)
      });
    });

    describe("normToJsonapi", () =>  {
      it("should convert normalized to jsonapi for multiple items", () =>  {
        const { normToJsonapi } = _testing
        expect(normToJsonapi(norm_record)).to.deep.equal(json_record)
      });

      it("should convert normalized to jsonapi for a single item", () =>  {
        const { normToJsonapi } = _testing
        expect(normToJsonapi(norm_item1)).to.deep.equal(json_item1)
      });
    });

    describe("normToJsonapiItem", () => {
      it("should convert normalized to jsonapi for a single item", () =>  {
        const { normToJsonapiItem } = _testing
        expect(normToJsonapiItem(norm_item1)).to.deep.equal(json_item1)
      });
    })

    describe("normToStore", () => {
      it("should convert normalized to store", () => {
        const { normToStore } = _testing
        expect(normToStore(norm_record)).to.deep.equal(store_record)
      })
      it("should convert normalized to store for a single item", () => {
        const { normToStore } = _testing
        expect(normToStore(norm_item1)).to.deep.equal(store_item1)
      })
    })

  }); // Helper methods

  describe("jsonapiModule getters", () =>  {
    it("should export getters", () =>  {
      expect(_testing.getters).to.be.a('function');
    });

    describe("get", () => {
      it("should return all state", () => {
        const { get } = jm.getters
        const result = get(store_record)()
        expect(result).to.deep.equal(norm_state)
      })
      it("should return all state for a single endpoint", () => {
        const { get } = jm.getters
        const result = get(store_record)({'_jv': {'type': 'widget'}})
        expect(result).to.deep.equal(norm_record)
      })
      it("should return all state for a single endpoint with only 1 record", () => {
        const { get } = jm.getters
        const result = get(store_item1)({'_jv': {'type': 'widget'}})
        expect(result).to.deep.equal(norm_item1)
      })
      it("should return a single id from state", () => {
        const { get } = jm.getters
        const result = get(store_item1)({'_jv': {'type': 'widget', 'id': '1'}})
        expect(result).to.deep.equal(norm_item1)
      })
    })
  }); // getters
});
