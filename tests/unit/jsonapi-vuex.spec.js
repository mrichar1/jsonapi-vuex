import chai, { expect } from 'chai'
import chaiAsPromised from 'chai-as-promised'
import sinonChai from 'sinon-chai'
import axios from 'axios'
import MockAdapter from 'axios-mock-adapter'

import { _testing, jsonapiModule } from '../../src/jsonapi-vuex'
import createStubContext from './stubs/context'
import createJsonapiModule from './utils/createJsonapiModule'
import {
  jsonFormat as createJsonWidget1,
  normFormat as createNormWidget1,
  normFormatPatch as createNormWidget1Patch,
  normFormatUpdate as createNormWidget1Update,
  storeFormat as createStoreWidget1,
} from './fixtures/widget1'
import { normFormat as createNormWidget2 } from './fixtures/widget2'
import { normFormat as createNormWidget3 } from './fixtures/widget3'
import {
  jsonFormat as createJsonRecord,
  normFormatWithRels as createNormRecordRels,
  storeFormat as createStoreRecord,
} from './fixtures/record'

chai.use(sinonChai)
chai.use(chaiAsPromised)

// 'global' variables (redefined in beforeEach)
let jm,
  clock,
  stubContext,
  jsonWidget1,
  jsonRecord,
  normWidget1,
  normWidget2,
  normWidget3,
  normWidget1_rels,
  normWidget2_rels,
  normWidget1_patch,
  normWidget1_update,
  normRecord,
  normRecordRels,
  storeWidget1,
  storeWidget1_update,
  storeRecord

// Mock up a fake axios-like api instance
const api = axios.create({ baseURL: '' })
const mockApi = new MockAdapter(api)

before(function() {
  // Common variables shared by `require`d submodules.
  this.api = api
  this.mockApi = mockApi
})

beforeEach(function() {
  // Set up fake timers
  clock = sinon.useFakeTimers()

  // Remove mock handlers
  mockApi.reset()

  // Set up commonly used data objects

  jm = createJsonapiModule(api)

  // Stub the context's commit function to evaluate calls to it.
  stubContext = createStubContext(jm)

  // Data in JSONAPI JSON form

  jsonWidget1 = createJsonWidget1()
  jsonRecord = createJsonRecord()

  // Data in Normalised/Restructured form

  normWidget1 = createNormWidget1()
  normWidget1_patch = createNormWidget1Patch()
  normWidget1_update = createNormWidget1Update()

  normWidget2 = createNormWidget2()
  normWidget3 = createNormWidget3()

  normRecord = {
    [normWidget1['_jv']['id']]: normWidget1,
    [normWidget2['_jv']['id']]: normWidget2,
    [normWidget3['_jv']['id']]: normWidget3,
  }

  normRecordRels = createNormRecordRels()
  normWidget1_rels = normRecordRels[normWidget1['_jv']['id']]
  normWidget2_rels = normRecordRels[normWidget2['_jv']['id']]

  // Data in Store form

  storeWidget1 = createStoreWidget1()
  storeWidget1_update = {
    widget: {
      '1': {
        ...normWidget1_update,
      },
    },
  }
  storeRecord = createStoreRecord()
})

afterEach(function() {
  // Undo fake timers
  clock = sinon.restore()
})

describe('jsonapi-vuex tests', function() {
  it('should export jsonapiModule', function() {
    expect(jsonapiModule).to.exist
  })

  describe('config handling', function() {
    it('Should override default config', function() {
      const conf = { jvtag: '_splat' }
      const { jvConfig } = _testing
      jm = jsonapiModule(api, conf)
      expect(jvConfig['jvtag']).to.equal('_splat')
    })
  })

  describe('jsonapiModule actions', function() {
    require('./actions/get.spec')
    require('./actions/fetch.spec')
    require('./actions/getRelated.spec')
    require('./actions/post.spec')
    require('./actions/create.spec')
    require('./actions/patch.spec')
    require('./actions/update.spec')
    require('./actions/delete.spec')
  })

  describe('jsonapiModule mutations', function() {
    describe('deleteRecord', function() {
      it('should delete a record (data) from the Vue store', function() {
        const { deleteRecord } = jm.mutations
        deleteRecord(storeWidget1, normWidget1)
        expect(storeWidget1[normWidget1['_jv']['type']]).to.not.have.key(
          normWidget1['_jv']['id']
        )
      })
      it('should delete a record (string) from the store', function() {
        const { deleteRecord } = jm.mutations
        // Leading slash is incorrect syntax, but we should handle it so test with it in
        deleteRecord(storeWidget1, 'widget/1')
        expect(storeWidget1[normWidget1['_jv']['type']]).to.not.have.key(
          normWidget1['_jv']['id']
        )
      })
      it('should throw an error if no type or id present.', function() {
        const { deleteRecord } = jm.mutations
        // expect needs a function to call, not the return from a function
        expect(() => deleteRecord(storeWidget1, { _jv: {} })).to.throw(
          _testing.RecordError
        )
      })
    })

    describe('addRecords', function() {
      it('should add several records to the store', function() {
        const { addRecords } = jm.mutations
        const state = {}
        addRecords(state, normRecord)
        expect(state).to.deep.equal(storeRecord)
      })
    })

    describe('updateRecord', function() {
      it('should update a specific attribute of a record already in the store', function() {
        const { updateRecord } = jm.mutations
        updateRecord(storeWidget1, normWidget1_patch)
        expect(storeWidget1).to.deep.equal(storeWidget1_update)
      })
      it('should throw an error if no type or id present.', function() {
        const { updateRecord } = jm.mutations
        // expect needs a function to call, not the return from a function
        expect(() => updateRecord(storeWidget1, { _jv: {} })).to.throw(
          _testing.RecordError
        )
      })
    })

    describe('setStatus', function() {
      it('should set the status for a specific id', function() {
        const state = { _jv: {} }
        const { setStatus } = jm.mutations
        setStatus(state, { id: 2, status: 'splat' })
        expect(state['_jv'][2]).to.have.keys(['status', 'time'])
      })
    })

    describe('deleteStatus', function() {
      it('should delete the status for a specific id', function() {
        const state = {
          _jv: {
            1: {
              status: 'SUCCESS',
              time: 0,
            },
          },
        }
        const { deleteStatus } = jm.mutations
        deleteStatus(state, 1)
        expect(state['_jv']).to.deep.equal({})
      }),
        it('should not error if deleting a non-existent id', function() {
          const state = { _jv: {} }
          const { deleteStatus } = jm.mutations
          expect(() => deleteStatus(state, 2)).to.not.throw()
        })
    })
  }) // mutations

  describe('jsonapiModule helpers', function() {
    describe('getTypeId', function() {
      it('should get type & id from string', function() {
        const { getTypeId } = _testing
        expect(getTypeId('widget/1')).to.deep.equal(['widget', '1'])
      })
      it('should get type only from string', function() {
        const { getTypeId } = _testing
        expect(getTypeId('widget')).to.deep.equal(['widget'])
      })
      it('should get type, id & relname from string', function() {
        const { getTypeId } = _testing
        expect(getTypeId('widget/1/relname')).to.deep.equal([
          'widget',
          '1',
          'relname',
        ])
      })
      it('should get type & id from norm data', function() {
        const { getTypeId } = _testing
        expect(getTypeId(normWidget1)).to.deep.equal(['widget', '1'])
      })
      it('should get type only from norm data', function() {
        const { getTypeId } = _testing
        delete normWidget1['_jv']['id']
        expect(getTypeId(normWidget1)).to.deep.equal(['widget'])
      })
    })

    describe('jsonapiToNormItem', function() {
      it('should convert jsonapi to normalized for a single item', function() {
        const { jsonapiToNormItem } = _testing
        expect(jsonapiToNormItem(jsonWidget1)).to.deep.equal(normWidget1)
      })
      it("should preserve deeply nested '_jv' keys", function() {
        const { jsonapiToNormItem } = _testing
        expect(jsonapiToNormItem(jsonWidget1)).to.deep.equal(normWidget1)
      })
    })

    describe('jsonapiToNorm', function() {
      it('should convert jsonapi to normalized for a single item', function() {
        const { jsonapiToNorm } = _testing
        expect(jsonapiToNorm(jsonWidget1)).to.deep.equal(normWidget1)
      })

      it('should convert jsonapi to normalized for an array of records', function() {
        const { jsonapiToNorm } = _testing
        expect(jsonapiToNorm(jsonRecord['data'])).to.deep.equal(normRecord)
      })

      it('should return an empty object if input is undefined', function() {
        const { jsonapiToNorm } = _testing
        expect(jsonapiToNorm(undefined)).to.deep.equal({})
      })
    })

    describe('normToJsonapi', function() {
      it('should convert normalized to jsonapi for multiple items', function() {
        const { normToJsonapi } = _testing
        expect(normToJsonapi(normRecord)).to.deep.equal(jsonRecord)
      })

      it('should convert normalized to jsonapi for a single item', function() {
        const { normToJsonapi } = _testing
        expect(normToJsonapi(normWidget1)).to.deep.equal({
          data: jsonWidget1,
        })
      })
    })

    describe('normToJsonapiItem', function() {
      it('should convert normalized to jsonapi for a single item', function() {
        const { normToJsonapiItem } = _testing
        expect(normToJsonapiItem(normWidget1)).to.deep.equal(jsonWidget1)
      })
      it('should convert normalized to jsonapi with root rels', function() {
        jm = jsonapiModule(api, { followRelationshipsData: true })
        const { normToJsonapiItem } = _testing
        const { addJvHelpers } = _testing
        // Add JvHelper methods to object
        normWidget1_rels = addJvHelpers(normWidget1_rels)
        expect(normToJsonapiItem(normWidget1_rels)).to.deep.equal(jsonWidget1)
      })
      it('should convert normalized to jsonapi for a single item with no id (POST)', function() {
        const { normToJsonapiItem } = _testing
        delete normWidget1['_jv']['id']
        delete jsonWidget1['id']
        expect(normToJsonapiItem(normWidget1)).to.deep.equal(jsonWidget1)
      })
    })

    describe('normToStore', function() {
      it('should convert normalized to store', function() {
        const { normToStore } = _testing
        expect(normToStore(normRecord)).to.deep.equal(storeRecord)
      })
      it('should convert normalized to store for a single item', function() {
        const { normToStore } = _testing
        expect(normToStore(normWidget1)).to.deep.equal(storeWidget1)
      })
    })
    describe('unpackArgs', function() {
      it('Should convert a single arg into an array with empty config', function() {
        const { unpackArgs } = _testing
        expect(unpackArgs('splat')).to.deep.equal(['splat', {}])
      })
      it('Should leave an args array as-is', function() {
        const { unpackArgs } = _testing
        expect(unpackArgs(['splat', {}])).to.deep.equal(['splat', {}])
      })
    })

    describe('followRelationships', function() {
      it('Should expand relationships into rels for a single item', function() {
        const { followRelationships } = _testing
        let rels = followRelationships(storeRecord, normWidget1)['_jv']['rels']['widgets'] // prettier-ignore
        expect(rels).to.deep.equal(normWidget2_rels)
      })
    })

    describe('actionSequence', function() {
      it('Should return incrementing numbers', function() {
        // Set fake context for timeout callback
        let context = { commit: () => {} }
        let { actionSequence } = _testing
        expect(actionSequence(context)).to.be.below(actionSequence(context))
      })
      it('Should call deleteStatus after timeout', function() {
        let { actionSequence, jvConfig } = _testing
        jvConfig['actionStatusCleanAge'] = 10
        actionSequence(stubContext)
        clock.tick(11000)
        expect(stubContext.commit).to.have.been.calledWith('deleteStatus')
      })
    })
  }) // Helper methods

  describe('jsonapiModule getters', function() {
    describe('get', function() {
      it('should return all state', function() {
        const { get } = jm.getters
        const result = get(storeRecord)()
        expect(result).to.deep.equal(storeRecord)
      })
      it('should return all state for a single endpoint', function() {
        const { get } = jm.getters
        const result = get(storeRecord)({ _jv: { type: 'widget' } })
        expect(result).to.deep.equal(normRecord)
      })
      it('should return all state for a single endpoint with a single record', function() {
        const { get } = jm.getters
        const result = get(storeWidget1)({ _jv: { type: 'widget' } })
        expect(result).to.deep.equal(storeWidget1['widget'])
      })
      it('should return a single id from state', function() {
        const { get } = jm.getters
        const result = get(storeWidget1)({
          _jv: { type: 'widget', id: '1' },
        })
        expect(result).to.deep.equal(normWidget1)
      })
      it('should accept a string path to object', function() {
        const { get } = jm.getters
        const result = get(storeWidget1)('widget/1')
        expect(result).to.deep.equal(normWidget1)
      })
      it('should filter results using jsonpath, returning a single item', function() {
        const { get } = jm.getters
        const result = get(storeRecord)('widget', '$[?(@.bar=="baz")]')
        expect(result).to.deep.equal({
          [normWidget1['_jv']['id']]: normWidget1,
        })
      })
      it('should filter results using jsonpath, returning multiple items', function() {
        const { get } = jm.getters
        const result = get(storeRecord)('widget', '$[?(@.foo)]')
        expect(result).to.deep.equal(normRecord)
      })
      it('should filter results using jsonpath, returning no items', function() {
        const { get } = jm.getters
        const result = get(storeRecord)('widget', '$[?(@.nosuchkey)]')
        expect(result).to.deep.equal({})
      })
      it('should filter whole store using jsonpath, returning a single item', function() {
        const { get } = jm.getters
        // Return all records of any type with id: 1
        const result = get(storeRecord)('', '$.*.1')
        expect(result).to.deep.equal({
          [normWidget1['_jv']['id']]: normWidget1,
        })
      })
      it('should return empty object if type not in state', function() {
        const { get } = jm.getters
        const result = get({})('widget')
        expect(result).to.deep.equal({})
      })
      it('should follow relationships data (single item)', function() {
        jm = jsonapiModule(api, { followRelationshipsData: true })
        const { get } = jm.getters
        const result = get(storeRecord, { get: get })('widget/1')
        expect(normWidget1_rels).to.deep.equal(result)
      })
      it('should follow relationships data (array)', function() {
        jm = jsonapiModule(api, { followRelationshipsData: true })
        const { get } = jm.getters
        const result = get(storeRecord, { get: get })('widget/2')
        expect(normWidget2_rels).to.deep.equal(result)
      })
      it('should follow relationships data (array) for a collection', function() {
        jm = jsonapiModule(api, { followRelationshipsData: true })
        const { get } = jm.getters
        const result = get(storeRecord, { get: get })('widget')
        expect(normRecordRels).to.deep.equal(result)
      })
    })

    describe('status', function() {
      it('should return the status for a given id', function() {
        const { status } = jm.getters
        let state = { _jv: { 1: { status: 'splat' } } }
        const result = status(state)(1)
        expect(result).to.equal('splat')
      })
      it('should return the status for a given action (promise)', function() {
        const { status } = jm.getters
        let state = { _jv: { 1: { status: 'splat' } } }
        const result = status(state)({ _jvId: 1 })
        expect(result).to.equal('splat')
      })
    })
  }) // getters

  describe('Custom Exceptions', function() {
    describe('status', function() {
      it('should return the status for a given id', function() {
        const { status } = jm.getters
        let state = { _jv: { 1: { status: 'splat' } } }
        const result = status(state)(1)
        expect(result).to.equal('splat')
      })
      it('should return the status for a given action (promise)', function() {
        const { status } = jm.getters
        let state = { _jv: { 1: { status: 'splat' } } }
        const result = status(state)({ _jvId: 1 })
        expect(result).to.equal('splat')
      })
    })
  }) // getters

  describe('Custom Exceptions', function() {
    describe('RecordError', function() {
      it('Should have a message and object', function() {
        const msg = 'hello'
        const obj = { invalid: 'json' }
        const exc = new _testing.RecordError(msg, obj)
        expect(exc.message).to.equal(msg)
        expect(exc.value).to.equal(obj)
      })
    })
  }) // Exceptions
})
