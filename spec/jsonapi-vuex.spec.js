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

    describe("add_record", function() {
      it("should add records to the store")

      it("should add a single item to the store")

      it("should fail gravefully")

    })

    describe("delete_record", function() {
      it("should delete a single record", function() {
        const state = {
          'records': {
            'widgets': {
              '1': 'foo'
            }
          }
        }

        _testing.mutations.delete_record(state, {type: 'widgets', id: '1'})
        expect(state['records']['widgets']).to.not.have.key('1');
      });

      it("should gracefully handle delete requests for non-existent objects")
    })
  });

  describe("jsonapiModule helpers", function() {
    describe("addRecord", function() {
      it("should add a record to Vue store", function() {
        const { addRecords } = _testing
        const records = {}
        const newRecords = [
          {
            'id': '1',
            'type': 'widget',
            'attributes': {'foo': '1'}
          }
]

        addRecords(records)(newRecords)
        expect(records).to.have.key('widget')
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

        const denormItem = {
          'widget': {
            '1': {
              attributes: {'foo': 1}
            }
          }
        }
        expect(normalizeItem(item)).to.deep.equal(denormItem)
      });
    })


    describe("normalize", function() {
      it("should normalize a single item", function() {
        const { normalize } = _testing
        const { normalizeItem } = _testing
        const item = {
          id: '1',
          type: 'widget',
          attributes: {'foo': 1}
        }

        const denormItem = {
          'widget': {
            '1': {
              attributes: {'foo': 1}
            }
          }
        }
        expect(normalize(item)).to.deep.equal(denormItem)
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

        const denormRecord = {
          'widget': {
            '1': {
              attributes: {'foo': 1}
            },
            '2': {
              attributes: {'foo': 2}
            }
          }
        }
        expect(normalize(record)).to.deep.equal(denormRecord)
      });
    }); // normalize

    describe("denormalize", function() {
      it("should denormalize multiple items", function() {
         const { denormalize } = _testing

         const denormRecord = {
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

        expect(denormalize(denormRecord)).to.deep.equal(record)

      });

      it("should denormalize a single item", function() {
         const { denormalize } = _testing

         const denormRecord = {
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

         expect(denormalize(denormRecord)).to.deep.equal(record)
      });

    }); // denormalize
  }); // Helper methods

  describe("jsonapiModule getters", function() {
    it("should export getters", function() {
      expect(_testing.getters).to.be.an('object');
    });
  }); // getters

});
