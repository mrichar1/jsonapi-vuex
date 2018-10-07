import chai, {expect} from 'chai';
import sinonChai from 'sinon-chai';
import axios from 'axios';
import MockAdapter from 'axios-mock-adapter';
import { jsonapiModule, _testing } from '../src/jsonapi-vuex.js';

chai.use(sinonChai)

// 'global' variables (redefined in beforeEach)
var jm, state, item1, item2, item1_patch, norm_item1, norm_item2, norm_item1_update, record, norm_record


// Mock up a fake axios-like api instance
const api = axios.create({ baseURL: 'http://example.com'})

let mock_api = new MockAdapter(api);

// Mock vuex context Object
const context = {
  commit: () => {}
}

// Stub the context object to evaluate calls to it.
const stub_context = sinon.stub(context)


beforeEach(() =>  {
// Set up commonly used data objects

  mock_api.reset()
  jm = jsonapiModule(api)

  state = {records: {}}

  item1 = {
    id: '1',
    type: 'widget',
    attributes: {
      'foo': 1,
      'bar': 'baz'
    }
  }

  item2 = {
    id: '2',
    type: 'widget',
    attributes: {
      'foo': 2
    }
  }

  // item1 with a single attribute modified
  item1_patch = {
    id: '1',
    type: 'widget',
    attributes: {'foo': 'update'}
  }

  norm_item1 = {
    'widget': {
      '1': {
        attributes: {
          'foo': 1,
          'bar': 'baz'
        }
      }
    }
  }

  // norm_item1 post-patch
  norm_item1_update = {
    'widget': {
      '1': {
        attributes: {
          'foo': 'update',
          'bar': 'baz'
        }
      }
    }
  }


  norm_item2 = {
    'widget': {
      '2': {
        attributes: {'foo': 2}
      }
    }
  }

  record = [
    item1, item2
  ]

  norm_record = {widget: {...norm_item1['widget'], ...norm_item2['widget']}}

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
        mock_api.onAny().reply(200, {data: item1})
        jm.actions.get(context, item1)
          .then(res => {
            expect(mock_api.history.get[0].url).to.equal(`/${item1['type']}/${item1['id']}`)
            done()
          })
      })
      it("should update record(s) in the store", (done) => {
        mock_api.onAny().reply(200, {data: item1})
        jm.actions.get(context, item1)
          .then(res => {
            expect(stub_context.commit).to.have.been.calledWith("update_record", item1)
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
        mock_api.onAny().reply(200, {data: item1})
        jm.actions.post(context, item1)
          .then(res => {
            expect(mock_api.history.post[0].url).to.equal(`/${item1['type']}/${item1['id']}`)
            done()
          })
      })
      it("should add record(s) to the store", (done) => {
        mock_api.onAny().reply(200, {data: item1})
        jm.actions.post(context, item1)
          .then(res => {
            expect(stub_context.commit).to.have.been.calledWith("update_record", item1)
            done()
          })
      })
      it("should POST data", (done) => {
        mock_api.onAny().reply(200, {data: item1})
        jm.actions.post(context, item1)
          .then(res => {
            // History stores data as JSON string, so parse back to object
            expect(JSON.parse(mock_api.history.post[0].data)).to.deep.equal(item1)
            done()
          })
      })

      it("should fail gracefully")
    })

    describe("create", () => {
      it("should be an alias for post", () => {
        expect(jm.actions.create).to.equal(jm.actions.post)
      })
    })

    describe("patch", () =>  {
      it("should make an api call to PATCH item(s)", (done) => {
        mock_api.onAny().reply(200, {data: item1})
        jm.actions.patch(context, item1_patch)
          .then(res => {
            expect(mock_api.history.patch[0].url).to.equal(`/${item1['type']}/${item1['id']}`)
            done()
          })
      })
      it("should update record(s) in the store", (done) => {
        mock_api.onAny().reply(200, {data: item1})
        jm.actions.patch(context, item1_patch)
          .then(res => {
            expect(stub_context.commit).to.have.been.calledWith("update_record", item1_patch)
            done()
          })
      })
      it("should fail gracefully")
    })

    describe("update", () => {
      it("should be an alias for patch", () => {
        expect(jm.actions.update).to.equal(jm.actions.patch)
      })
    })

    describe("delete", () =>  {
      it("should make an api call to DELETE item(s)", (done) => {
        mock_api.onAny().reply(204)
        jm.actions.delete(context, item1)
          .then(res => {
            expect(mock_api.history.delete[0].url).to.equal(`/${item1['type']}/${item1['id']}`)
            done()
          })
      })

      it("should delete record(s) from the store", (done) => {
        mock_api.onAny().reply(204)
        jm.actions.delete(context, item1)
          .then(res => {
            expect(stub_context.commit).to.have.been.calledWith("delete_record", item1)
            done()
          })
      })

      it("should fail gracefully")
    })
  });

  describe("jsonapiModule mutations", () =>  {
    it("should export mutations", () =>  {
      expect(_testing.mutations).to.be.a('function');
    });

    describe("delete_record", () =>  {
      it("should delete a record from the Vue store", () =>  {
        const { delete_record } = jm.mutations
        const state_i1 = { 'records': norm_item1 }
        delete_record(state_i1, item1)
        expect(state_i1['records'][item1['type']]).to.not.have.key(item1['id'])
      })
    })

    describe("update_record", () => {
      it("should add a new record to the store", () => {
        const { update_record } = jm.mutations
        const state_i1 = {'records': {} }
        update_record(state_i1, item1)
        expect(state_i1['records']).to.deep.equal(norm_item1)
      })

      it("should update a specific attribute of a record already in the store", () => {
        const { update_record } = jm.mutations
        const state_i1 = {'records': norm_item1 }
        update_record(state_i1, item1_patch)
        expect(state_i1['records']).to.deep.equal(norm_item1_update)
      })
    })
  });

  describe("jsonapiModule helpers", () =>  {
    describe("normalizeItem", () =>  {
      it("should normalize a single item", () =>  {
        const { normalizeItem } = _testing
        expect(normalizeItem(item1)).to.deep.equal(norm_item1)
      });
    })


    describe("normalize", () =>  {
      it("should normalize a single item", () =>  {
        const { normalize } = _testing
        expect(normalize(item1)).to.deep.equal(norm_item1)
      });

      it("should normalize an array of records", () =>  {
        const { normalize } = _testing
        expect(normalize(record)).to.deep.equal(norm_record)
      });
    }); // normalize

    describe("denormalize", () =>  {
      it("should denormalize multiple items", () =>  {
        const { denormalize } = _testing
        expect(denormalize(norm_record)).to.deep.equal(record)

      });

      it("should denormalize a single item", () =>  {
        const { denormalize } = _testing
        expect(denormalize(norm_item1)).to.deep.equal(item1)
      });

    }); // denormalize
  }); // Helper methods

  describe("jsonapiModule getters", () =>  {
    it("should export getters", () =>  {
      expect(_testing.getters).to.be.a('function');
    });
  }); // getters

});
