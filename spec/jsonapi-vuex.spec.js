import 'chai/register-expect';
import { jsonapiModule, _testing } from '../src/jsonapi-vuex.js';

describe("jsonapi-vuex tests", function() {

  it("should export jsonapiModule", function() {
    expect(jsonapiModule).to.exist;
  });

  describe("jsonapiModule actions", function() {

    it("should export actions", function() {
      expect(_testing.actions).to.be.an('object');
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
      expect(_testing.mutations).to.be.an('object');
    });
  });

  describe("jsonapiModule helpers", function() {
    describe("addRecord", function() {
      it("should add a record to Vue store", function() {
        const { addRecord } = _testing
        const state = {records: {}}
        const record = [
          {
            'id': '1',
            'type': 'widget',
            'attributes': {'foo': '1'}
          }
        ]

        addRecord(state, record)
        expect(state['records']).to.have.key('widget')
      });
    });
    describe("normalizeItem", function() {
      it("should normalize a single item", function() {
        const { normalizeItem } = _testing
        const item = {
          id: '1',
          type: 'widget',
          attributes: {'foo': 1}
        }

        const denorm_item = {
          'widget': {
            '1': {
              attributes: {'foo': 1}
            }
          }
        }
        expect(normalizeItem(item)).to.deep.equal(denorm_item)
      });
    })


    describe("normalize", function() {
      it("should normalize a single item", function() {
        const { normalize } = _testing
        const item = {
          id: '1',
          type: 'widget',
          attributes: {'foo': 1}
        }

        const denorm_item = {
          'widget': {
            '1': {
              attributes: {'foo': 1}
            }
          }
        }
        expect(normalize(item)).to.deep.equal(denorm_item)
      });

      it("should normalize an array of records", function() {
        const { normalize } = _testing
        const record = [
          {
            id: '1',
            type: 'widget',
            attributes: {'foo': 1}
          },
          {
            id: '2',
            type: 'widget',
            attributes: {'foo': 2}
          }
        ]

        const denorm_record = {
          'widget': {
            '1': {
              attributes: {'foo': 1}
            },
            '2': {
              attributes: {'foo': 2}
            }
          }
        }
        expect(normalize(record)).to.deep.equal(denorm_record)
      });
    }); // normalize

    describe("denormalize", function() {
      it("should denormalize multiple items", function() {
         const { denormalize } = _testing

         const denorm_record = {
           'widget': {
            '1': {
               attributes: {'foo': 1}
             },
             '2': {
               attributes: {'foo': 2}
             }
           }
         }

         const record = [
           {
             id: '1',
             type: 'widget',
             attributes: {'foo': 1}
           },
           {
             id: '2',
             type: 'widget',
             attributes: {'foo': 2}
           }
         ]

        expect(denormalize(denorm_record)).to.deep.equal(record)

      });

      it("should denormalize a single item", function() {
         const { denormalize } = _testing

         const denorm_record = {
           'widget': {
            '1': {
               attributes: {'foo': 1}
             }
           }
         }

         const record = {
             id: '1',
             type: 'widget',
             attributes: {'foo': 1}
         }

         expect(denormalize(denorm_record)).to.deep.equal(record)
      });

    }); // denormalize
  }); // Helper methods

  describe("jsonapiModule getters", function() {
    it("should export getters", function() {
      expect(_testing.getters).to.be.an('object');
    });
  }); // getters

});
