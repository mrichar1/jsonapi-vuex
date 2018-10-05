import chai, {expect} from 'chai';
import sinonChai from 'sinon-chai';
import { jsonapiModule, _testing } from '../src/jsonapi-vuex.js';

chai.use(sinonChai)

// 'global' variables (redefined in beforeEach)
var jm, state, item1, item2, norm_item1, norm_item2, record, norm_record

const api = {
  get: (path) => {},
  post: (path, body) => {},
  patch: (path, body) => {},
  delete: (path, body) => {},
}
// Stub for axios-like api
const stub_api = sinon.stub(api)


beforeEach(function() {
// Set up commonly used data objects

  jm = jsonapiModule(stub_api)

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

describe("jsonapi-vuex tests", function() {

  it("should export jsonapiModule", function() {
    expect(jsonapiModule).to.exist;
  });

  describe("jsonapiModule actions", function() {

    it("should export actions", function() {
      expect(_testing.actions).to.be.a('function');
    });

    describe("fetch", function() {
        it("should make an api call to GET item(s)")
        it("should add record(s) to the store")
        it("should fail gracefully")
    })

    describe("create", function() {
      it("should make an api call to POST item(s)")
      it("should add record(s) to the store")
      it("should fail gracefully")
    })

    describe("update", function() {
      it("should make an api call to PATCH item(s)")
      it("should update record(s) in the store")
      it("should fail gracefully")

    })

    describe("delete", function() {
      it("should make an api call to DELETE item(s)")
      it("should delete record(s) from the store")
      it("should fail gracefully")
    })
  });

  describe("jsonapiModule mutations", function() {
    it("should export mutations", function() {
      expect(_testing.mutations).to.be.a('function');
    });

    describe("add_record", function() {
      it("should add a record to Vue store", function() {
        const { add_record } = jm.mutations
        add_record(state, record)
        expect(state['records']).to.have.key('widget')
      });
    });
  });

  describe("jsonapiModule helpers", function() {
    describe("normalizeItem", function() {
      it("should normalize a single item", function() {
        const { normalizeItem } = _testing
        expect(normalizeItem(item1)).to.deep.equal(norm_item1)
      });
    })


    describe("normalize", function() {
      it("should normalize a single item", function() {
        const { normalize } = _testing
        expect(normalize(item1)).to.deep.equal(norm_item1)
      });

      it("should normalize an array of records", function() {
        const { normalize } = _testing
        expect(normalize(record)).to.deep.equal(norm_record)
      });
    }); // normalize

    describe("denormalize", function() {
      it("should denormalize multiple items", function() {
        const { denormalize } = _testing
        expect(denormalize(norm_record)).to.deep.equal(record)

      });

      it("should denormalize a single item", function() {
        const { denormalize } = _testing
        expect(denormalize(norm_item1)).to.deep.equal(item1)
      });

    }); // denormalize
  }); // Helper methods

  describe("jsonapiModule getters", function() {
    it("should export getters", function() {
      expect(_testing.getters).to.be.a('function');
    });
  }); // getters

});
