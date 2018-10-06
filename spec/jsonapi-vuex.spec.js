import chai, {expect} from 'chai';
import sinonChai from 'sinon-chai';
import axios from 'axios';
import MockAdapter from 'axios-mock-adapter';
import { jsonapiModule, _testing } from '../src/jsonapi-vuex.js';

chai.use(sinonChai)

// 'global' variables (redefined in beforeEach)
var jm, state, item1, item2, norm_item1, norm_item2, record, norm_record


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
    attributes: {'foo': 1}
    }

  item2 = {
    id: '2',
    type: 'widget',
    attributes: {'foo': 2}
  }

  norm_item1 = {
    'widget': {
      '1': {
        attributes: {'foo': 1}
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

    describe("fetch", () =>  {
        it("should make an api call to GET item(s)", function(done) {
          mock_api.onAny().reply(200, {data: item1})
          jm.actions.fetch(context, item1)
            .then(res => {
              expect(mock_api.history.get[0].url).to.equal(`/${item1['type']}/${item1['id']}`)
              done()
            })
        })
        it("should add record(s) to the store", function(done) {
          mock_api.onAny().reply(200, {data: item1})
          jm.actions.fetch(context, item1)
            .then(res => {
              expect(stub_context.commit).to.have.been.calledWith(sinon.match(/.*/), item1)
              done()
            })
        })

        it("should fail gracefully")
    })

    describe("create", () =>  {
      it("should make an api call to POST item(s)")
      it("should add record(s) to the store")
      it("should fail gracefully")
    })

    describe("update", () =>  {
      it("should make an api call to PATCH item(s)")
      it("should update record(s) in the store")
      it("should fail gracefully")

    })

    describe("delete", () =>  {
      it("should make an api call to DELETE item(s)")
      it("should delete record(s) from the store")
      it("should fail gracefully")
    })
  });

  describe("jsonapiModule mutations", () =>  {
    it("should export mutations", () =>  {
      expect(_testing.mutations).to.be.a('function');
    });

    describe("add_record", () =>  {
      it("should add a record to Vue store", () =>  {
        const { add_record } = jm.mutations
        add_record(state, record)
        expect(state['records']).to.have.key('widget')
      });
    });

    describe("delete_record", () =>  {
      it("should delete a record from the Vue store", () =>  {
        const { delete_record } = jm.mutations
        const state_i1 = { 'records': norm_item1 }
        delete_record(state_i1, item1)
        expect(state_i1['records'][item1['type']]).to.not.have.key(item1['id'])
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
