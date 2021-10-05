import chai, { expect } from 'chai'
import chaiAsPromised from 'chai-as-promised'
import sinonChai from 'sinon-chai'
import sinon from 'sinon'
import axios from 'axios'
import MockAdapter from 'axios-mock-adapter'

import { jsonapiModule, config, status, utils } from '../../src/jsonapi-vuex'
import createStubContext from './stubs/context'
import createJsonapiModule from './utils/createJsonapiModule'
import {
  jsonFormat as createJsonWidget1,
  normFormat as createNormWidget1,
  normFormatPatch as createNormWidget1Patch,
  normFormatUpdate as createNormWidget1Update,
  storeFormat as createStoreWidget1,
} from './fixtures/widget1'
import { jsonFormat as createJsonWidget2 } from './fixtures/widget2'
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
  stubContext,
  jsonWidget1,
  jsonWidget2,
  jsonRecord,
  normWidget1,
  normWidget2,
  normWidget3,
  normWidget1Rels,
  normWidget2Rels,
  normWidget1Patch,
  normWidget1Update,
  normRecord,
  normRecordRels,
  storeWidget1,
  storeWidget1Update,
  storeWidgetSpecialChars,
  storeRecord

// Mock up a fake axios-like api instance
const api = axios.create({ baseURL: '' })
const mockApi = new MockAdapter(api)

before(function () {
  // Common variables shared by `require`d submodules.
  this.api = api
  this.mockApi = mockApi
})

beforeEach(function () {
  // Remove mock handlers
  mockApi.reset()

  // Set up commonly used data objects

  jm = createJsonapiModule(api)

  // Stub the context's commit function to evaluate calls to it.
  stubContext = createStubContext(jm)

  // Data in JSONAPI JSON form

  jsonWidget1 = createJsonWidget1()
  jsonWidget2 = createJsonWidget2()
  jsonRecord = createJsonRecord()

  // Data in Normalised/Restructured form

  normWidget1 = createNormWidget1()
  normWidget1Patch = createNormWidget1Patch()
  normWidget1Update = createNormWidget1Update()

  normWidget2 = createNormWidget2()
  normWidget3 = createNormWidget3()

  normRecord = {
    [normWidget1['_jv']['id']]: normWidget1,
    [normWidget2['_jv']['id']]: normWidget2,
    [normWidget3['_jv']['id']]: normWidget3,
  }

  normRecordRels = createNormRecordRels()
  normWidget1Rels = normRecordRels[normWidget1['_jv']['id']]
  normWidget2Rels = normRecordRels[normWidget2['_jv']['id']]

  // Data in Store form

  storeWidget1 = createStoreWidget1()
  storeWidget1Update = {
    widget: {
      1: {
        ...normWidget1Update,
      },
    },
  }
  storeRecord = createStoreRecord()
  // Create a widget where id contains special chars
  storeWidgetSpecialChars = {
    widget: {
      '# ?': storeWidget1['widget']['1'],
    },
  }
})

afterEach(function () {})

describe('jsonapi-vuex tests', function () {
  it('should export jsonapiModule', function () {
    expect(jsonapiModule).to.exist
  })

  describe('jsonapiModule actions', function () {
    require('./actions/get.spec')
    require('./actions/search.spec')
    require('./actions/fetch.spec')
    require('./actions/getRelated.spec')
    require('./actions/deleteRelated.spec')
    require('./actions/patchRelated.spec')
    require('./actions/postRelated.spec')
    require('./actions/post.spec')
    require('./actions/create.spec')
    require('./actions/patch.spec')
    require('./actions/update.spec')
    require('./actions/delete.spec')
  })

  describe('jsonapiModule mutations', function () {
    describe('deleteRecord', function () {
      it('should delete a record (data) from the Vue store', function () {
        const { deleteRecord } = jm.mutations
        deleteRecord(storeWidget1, normWidget1)
        expect(storeWidget1[normWidget1['_jv']['type']]).to.not.have.key(normWidget1['_jv']['id'])
      })
      it('should delete a record (string) from the store', function () {
        const { deleteRecord } = jm.mutations
        // Leading slash is incorrect syntax, but we should handle it so test with it in
        deleteRecord(storeWidget1, 'widget/1')
        expect(storeWidget1[normWidget1['_jv']['type']]).to.not.have.key(normWidget1['_jv']['id'])
      })
      it('should throw an error if no type or id present.', function () {
        const { deleteRecord } = jm.mutations
        // expect needs a function to call, not the return from a function
        expect(() => deleteRecord(storeWidget1, { _jv: {} })).to.throw(utils.RecordError)
      })
      it('should not throw an error if trying to delete an object not in the store.', function () {
        const { deleteRecord } = jm.mutations
        // expect needs a function to call, not the return from a function
        deleteRecord(storeWidget1, { _jv: { type: 'nosuchtype', id: '999' } })
      })
    })

    describe('mergeRecords', function () {
      it('should update a record in the store (merge)', function () {
        jm = createJsonapiModule(api, { mergeRecords: true })
        const { mergeRecords } = jm.mutations
        mergeRecords(storeWidget1, normWidget1Patch)
        expect(storeWidget1).to.deep.equal(storeWidget1Update)
      })
    })

    describe('replaceRecords', function () {
      it('should add several records to the store (replace)', function () {
        const { replaceRecords } = jm.mutations
        // Put an object into state that should get replaced
        replaceRecords(storeWidget1Update, normRecord)
        expect(storeWidget1Update).to.deep.equal(storeRecord)
      })
    })

    describe('addRecords', function () {
      it('should add several records to the store (replace)', function () {
        const { addRecords } = jm.mutations
        // Put an object into state that should get replaced
        addRecords(storeWidget1Update, normRecord)
        expect(storeWidget1Update).to.deep.equal(storeRecord)
      })
      it('should update a record in the store (merge)', function () {
        jm = createJsonapiModule(api, { mergeRecords: true })
        const { addRecords } = jm.mutations
        addRecords(storeWidget1, normWidget1Patch)
        expect(storeWidget1).to.deep.equal(storeWidget1Update)
      })
    })

    describe('clearRecords', function () {
      it('should remove records from the store not in the response (clearOnUpdate)', function () {
        const { clearRecords } = jm.mutations
        const state = { widget: { 4: { foo: 4 } } }
        clearRecords(state, normRecord)
        // '4' not in storeRecord, so should no longer be present in state
        expect(state['widget']).to.not.have.property('4')
      })
    })
  }) // mutations

  describe('jsonapiModule helpers', function () {
    describe('deepCopy', function () {
      it('should deep copy an object, replacing helper methods', function () {
        let obj = { _jv: {} }
        // Add a getter that we expect to be overwritten
        Object.defineProperty(obj['_jv'], 'attrs', {
          get() {
            return 'string'
          },
          enumerable: true,
        })
        let newObj = utils.deepCopy(obj)
        // 'real' attrs should return an object, not a string
        expect(newObj['_jv']['attrs']).to.be.an('object')
      })
      it('should return the object as-is if empty.', function () {
        let obj = {}
        let newObj = utils.deepCopy(obj)
        expect(newObj).to.deep.equal({})
      })
    })
    describe('_copy', function () {
      it('should recursively (deep) copy simple objects', function () {
        // Create a simple object with a variety of content
        const obj = {
          undef: undefined,
          null: null,
          func: function () {},
          string: 'word',
          number: 10,
          false: false,
          _jv: {
            meta: {
              cat: 0,
              dog: '1',
              obj: {},
            },
          },
          array: [{}, [], undefined, 0, 'word'],
        }
        // Add a getter that we expect to be expanded out
        Object.defineProperty(obj, 'getter', {
          get() {
            return 'string'
          },
          enumerable: true,
        })
        let newObj = utils._copy(obj)
        expect(newObj).to.deep.equal(obj)
      })
    })
    describe('utils.cleanPatch', function () {
      it('should return patch unmodified if record not in state', function () {
        const res = utils.cleanPatch(normWidget1Patch, {})
        expect(res).to.deep.equal(normWidget1Patch)
      })
      it('should pick modified/new attributes from a record (no _jv)', function () {
        const res = utils.cleanPatch(normWidget1Patch, { widget: normRecord })
        expect(res).to.not.have.property('bar')
        expect(res['foo']).to.equal('update')
      })
      it('should pick modified/new attributes from a record (with _jv)', function () {
        const patch = JSON.parse(JSON.stringify(normWidget1))
        patch['foo'] = 'update'
        // Add the relationship to root (tests attrs getter)
        patch['widgets'] = {}
        utils.addJvHelpers(patch)

        const res = utils.cleanPatch(patch, { widget: normRecord })
        expect(res).to.not.have.property('bar')
        expect(res['foo']).to.equal('update')
        expect(res).to.not.have.property('widgets')
      })
    })

    describe('utils.updateRecords', function () {
      it('should add several records to the store (replace)', function () {
        // Put an object into state that should get replaced
        utils.updateRecords(storeWidget1Update, normRecord, false)
        expect(storeWidget1Update).to.deep.equal(storeRecord)
      })

      it('should add several records to the store (merge)', function () {
        utils.updateRecords(storeWidget1, normWidget1Patch, true)
        expect(storeWidget1).to.deep.equal(storeWidget1Update)
      })
      it('should not error if no type(s) in state', function () {
        // Ensures coverage for if (!(type in state))
        const state = {}
        utils.updateRecords(state, normRecord, true)
        expect(state).to.deep.equal(storeRecord)
      })
      it('should not alter existing records in the store', function () {
        // Add a test record to the store
        const state = { widget: { 4: { foo: 4 } } }
        utils.updateRecords(state, normRecord)
        // test record should stil exist
        expect(state['widget']).to.have.property('4')
      })
    })

    describe('processIncludedRecords', function () {
      it('should process included records', function () {
        jsonWidget1['included'] = [jsonWidget2]
        utils.processIncludedRecords(stubContext, { data: jsonWidget1 })
        expect(stubContext.commit).to.have.been.calledWith('mergeRecords')
      })
    })

    describe('utils.getTypeId', function () {
      it('should get type & id from string', function () {
        expect(utils.getTypeId('widget/1')).to.deep.equal(['widget', '1'])
      })
      it('should get type only from string', function () {
        expect(utils.getTypeId('widget')).to.deep.equal(['widget'])
      })
      it('should get type, id & relname from string', function () {
        expect(utils.getTypeId('widget/1/relname')).to.deep.equal(['widget', '1', 'relname'])
      })
      it('should get type & id from norm data', function () {
        expect(utils.getTypeId(normWidget1)).to.deep.equal(['widget', '1'])
      })
      it('should get type only from norm data', function () {
        delete normWidget1['_jv']['id']
        expect(utils.getTypeId(normWidget1)).to.deep.equal(['widget'])
      })
      it('should uri encode type and/or id', function () {
        const urlWidget = {
          _jv: {
            type: '/#',
            id: '? &',
          },
        }
        expect(utils.getTypeId(urlWidget)).to.deep.equal(['%2F%23', '%3F%20%26'])
      })
      it('should not uri encode type and/or id if encode=false', function () {
        const urlWidget = {
          _jv: {
            type: '/#',
            id: '? &',
          },
        }
        expect(utils.getTypeId(urlWidget, false)).to.deep.equal(['/#', '? &'])
      })
    })

    describe('utils.jsonapiToNormItem', function () {
      it('should convert jsonapi to normalized for a single item', function () {
        expect(utils.jsonapiToNormItem(jsonWidget1)).to.deep.equal(normWidget1)
      })
      it("should preserve deeply nested '_jv' keys", function () {
        expect(utils.jsonapiToNormItem(jsonWidget1)).to.deep.equal(normWidget1)
      })
    })

    describe('utils.jsonapiToNorm', function () {
      it('should convert jsonapi to normalized for a single item', function () {
        expect(utils.jsonapiToNorm(jsonWidget1)).to.deep.equal(normWidget1)
      })

      it('should convert jsonapi to normalized for an array of records', function () {
        expect(utils.jsonapiToNorm(jsonRecord['data'])).to.deep.equal(normRecord)
      })

      it('should return an empty object if input is undefined', function () {
        expect(utils.jsonapiToNorm(undefined)).to.deep.equal({})
      })
    })

    describe('utils.normToJsonapi', function () {
      it('should convert normalized to jsonapi for multiple items', function () {
        expect(utils.normToJsonapi(normRecord)).to.deep.equal(jsonRecord)
      })

      it('should convert normalized to jsonapi for a single item', function () {
        expect(utils.normToJsonapi(normWidget1)).to.deep.equal({
          data: jsonWidget1,
        })
      })
    })

    describe('utils.normToJsonapiItem', function () {
      it('should convert normalized to jsonapi for a single item', function () {
        expect(utils.normToJsonapiItem(normWidget1)).to.deep.equal(jsonWidget1)
      })
      it('should convert normalized to jsonapi with root rels', function () {
        jm = jsonapiModule(api, { followRelationshipsData: true })
        // Add JvHelper methods to object
        normWidget1Rels = utils.addJvHelpers(normWidget1Rels)
        expect(utils.normToJsonapiItem(normWidget1Rels)).to.deep.equal(jsonWidget1)
      })
      it('should convert normalized to jsonapi for a single item with no id (POST)', function () {
        delete normWidget1['_jv']['id']
        delete jsonWidget1['id']
        expect(utils.normToJsonapiItem(normWidget1)).to.deep.equal(jsonWidget1)
      })
    })

    describe('utils.normToStore', function () {
      it('should convert normalized to store', function () {
        expect(utils.normToStore(normRecord)).to.deep.equal(storeRecord)
      })
      it('should convert normalized to store for a single item', function () {
        expect(utils.normToStore(normWidget1)).to.deep.equal(storeWidget1)
      })
      it('should convert normalized item to store, removing rels from root', function () {
        jm = jsonapiModule(api, { followRelationshipsData: true })
        normWidget1Rels = utils.addJvHelpers(normWidget1Rels)
        expect(utils.normToStore(normWidget1Rels)).to.have.all.keys(storeWidget1)
      })
      it('should convert normalized records to store, removing rels from root', function () {
        jm = jsonapiModule(api, { followRelationshipsData: true })
        for (let item of Object.values(normRecordRels)) {
          item = utils.addJvHelpers(item)
        }
        expect(utils.normToStore(normRecordRels)).to.have.all.keys(storeRecord)
      })
    })
    describe('utils.unpackArgs', function () {
      it('Should convert a single arg into an array with empty config', function () {
        expect(utils.unpackArgs('splat')).to.deep.equal(['splat', {}])
      })
      it('Should leave an args array as-is', function () {
        expect(utils.unpackArgs(['splat', {}])).to.deep.equal(['splat', {}])
      })
    })

    describe('followRelationships', function () {
      it('should add a property relName.<getter> to the root (single item)', function () {
        const getters = { get: sinon.stub() }
        let rels = utils.followRelationships(storeRecord, getters, normWidget1)
        // Test if the the relName value is a getter
        expect(Object.getOwnPropertyDescriptor(rels, 'widgets')).to.have.property('get')
      })
      it('should add a property relName.id.<getter> to the root (array)', function () {
        const getters = { get: sinon.stub() }
        let rels = utils.followRelationships(storeRecord, getters, normWidget2)
        for (let id of Object.keys(rels['widgets'])) {
          // Test if the the relName value is a getter
          expect(Object.getOwnPropertyDescriptor(rels['widgets'], id)).to.have.property('get')
        }
      })
    })

    describe('utils.addJvHelpers', function () {
      beforeEach(function () {
        // Apply helper functions to normWidget1
        normWidget1 = utils.addJvHelpers(normWidget1)
        normWidget1Rels = utils.addJvHelpers(normWidget1Rels)
      })
      it('Should add methods to an objects _jv object', function () {
        expect(normWidget1['_jv']).to.include.keys(
          // 'attrs',
          // 'rels',
          'isAttr',
          'isRel'
        )
        // Keys doesn't count getter functions, so test separately
        expect(normWidget1['_jv']).to.have.property('attrs')
        expect(normWidget1['_jv']).to.have.property('rels')
      })
      it('Should list all object attributes', function () {
        const attrs = normWidget1['_jv'].attrs
        // throw away all but attrs
        delete normWidget1['_jv']
        expect(attrs).to.have.all.keys(normWidget1)
      })
      it('Should list all object rels', function () {
        const rels = normWidget1Rels['_jv'].rels
        expect(rels).to.have.all.keys(normWidget1Rels['_jv']['relationships'])
      })
      it('Should return true/false with isAttr', function () {
        for (let attr of Object.keys(normWidget1)) {
          if (attr !== '_jv') {
            expect(normWidget1['_jv'].isAttr(attr)).to.be.true
          }
        }
        expect(normWidget1['_jv'].isAttr('no_such_attr')).to.be.false
      })
      it('Should return true/false with isRel', function () {
        for (let rel of Object.keys(normWidget1['_jv']['relationships'])) {
          expect(normWidget1['_jv'].isRel(rel)).to.be.true
        }
        expect(normWidget1['_jv'].isRel('no_such_rel')).to.be.false
      })
    })

    describe('getURL function', function () {
      it('returns the path if a path is provided', function () {
        expect(utils.getURL('a/path')).to.equal('a/path')
      })
      describe('on objects', function () {
        describe('without links.self', function () {
          it('computes a path from type and id', function () {
            expect(utils.getURL(normWidget2)).to.equal('widget/2')
          })
        })
        describe('with links.self', function () {
          it('uses the URL', function () {
            expect(utils.getURL(normWidget1)).to.equal('/weirdPath/1')
          })
        })
      })
    })
    describe('utils.getRelationships', function () {
      it('should add a getter for a relationship (single item)', function () {
        const getters = { get: sinon.stub() }
        let rels = utils.getRelationships(getters, normWidget1)
        // Test if the the relName value is a getter
        expect(Object.getOwnPropertyDescriptor(rels, 'widgets')).to.have.property('get')
      })
      it('Should add a getter for a relationship (array)', function () {
        const getters = { get: sinon.stub() }
        let rels = utils.getRelationships(getters, normWidget2)
        // Test if the the relName value is a getter
        for (let id of Object.keys(rels['widgets'])) {
          expect(Object.getOwnPropertyDescriptor(rels['widgets'], id)).to.have.property('get')
        }
      })
      it('Should not limit recursion (recurseRelationships)', function () {
        config.recurseRelationships = true
        const getStub = sinon.stub()
        // Mark widget/2 (rel of widget/1) as already seen
        let seen = [['widgets', 'widget', '2']]
        let rels = utils.getRelationships({ get: getStub }, normWidget1, seen)
        // 'Get' the getter
        rels['widgets']
        // If it didn't stop, getter will have been called, and seen will have 'grown'
        expect(getStub).to.have.been.called
        expect(getStub.args[0][2]).to.not.deep.equal(seen)
      })
      it('Should limit recursion (!recurseRelationships)', function () {
        config.recurseRelationships = false
        const getStub = sinon.stub()
        // Mark widget/2 (rel of widget/1) as already seen
        let seen = [['widgets', 'widget', '2']]
        utils.getRelationships({ get: getStub }, normWidget1, seen)
        // No 'get' recursion occurs
        expect(getStub).to.not.have.been.called
      })
    })
    describe('ActionStatus', function () {
      it('_count should increment counter', function () {
        expect(status.counter).to.equal(0)
        status._count()
        expect(status.counter).to.equal(1)
      })
      it('maxID should limit counter', function () {
        status.maxID = 5
        status.counter = 5
        status._count()
        expect(status.counter).to.equal(1)
      })
      it('should return a promise with an ID', async function () {
        const prom = status.run(() => Promise.resolve())
        await prom
        expect(prom).to.have.property('_statusID')
      })
      it('should show success on completion', async function () {
        const prom = status.run(() => Promise.resolve())
        await prom
        // success value = 1
        expect(status.status).to.deep.equal({ [prom['_statusID']]: 1 })
      })
      it('should show error on completion', async function () {
        const prom = status.run(() => Promise.reject(new Error('fail')))
        try {
          await prom
        } catch (e) {
          // Check the error propagated correctly
          expect(e.message).to.equal('fail')
          // error value = -1
          expect(status.status).to.deep.equal({ [prom['_statusID']]: -1 })
        }
      })
      it('should have a modified success value', async function () {
        const mySuccess = 'well done'
        status.SUCCESS = mySuccess
        const prom = status.run(() => {
          return new Promise((resolve) => resolve())
        })
        await prom
        expect(status.status[prom['_statusID']]).to.equal(mySuccess)
      })
    })
  }) // Helper methods

  describe('jsonapiModule getters', function () {
    describe('get', function () {
      it('should return all state', function () {
        const { get } = jm.getters
        const result = get(storeRecord)()
        expect(result).to.deep.equal(storeRecord)
      })
      it('should return all state for a single endpoint', function () {
        const { get } = jm.getters
        const result = get(storeRecord)({ _jv: { type: 'widget' } })
        expect(result).to.deep.equal(normRecord)
      })
      it('should return all state for a single endpoint with a single record', function () {
        const { get } = jm.getters
        const result = get(storeWidget1)({ _jv: { type: 'widget' } })
        expect(result).to.deep.equal(storeWidget1['widget'])
      })
      it('should return a single id from state', function () {
        const { get } = jm.getters
        const result = get(storeWidget1)({
          _jv: { type: 'widget', id: '1' },
        })
        expect(result).to.deep.equal(normWidget1)
      })
      it('should return nothing for a non-existent type', function () {
        const { get } = jm.getters
        const result = get(storeWidget1)({
          _jv: { type: 'nosuchtype' },
        })
        expect(result).to.deep.equal({})
      })
      it('should return nothing for a non-existent id', function () {
        const { get } = jm.getters
        const result = get(storeWidget1)({
          _jv: { type: 'widget', id: '999' },
        })
        expect(result).to.deep.equal({})
      })
      it('should accept a string path to object', function () {
        const { get } = jm.getters
        const result = get(storeWidget1)('widget/1')
        expect(result).to.deep.equal(normWidget1)
      })
      it('should accept a string path with special chars without url-encoding', function () {
        const { get } = jm.getters
        const result = get(storeWidgetSpecialChars)('widget/# ?')
        expect(result).to.deep.equal(normWidget1)
      })
      it('should filter results using jsonpath, returning a single item', function () {
        const { get } = jm.getters
        const result = get(storeRecord)('widget', '$[?(@.bar=="baz")]')
        expect(result).to.deep.equal({
          [normWidget1['_jv']['id']]: normWidget1,
        })
      })
      it('should filter results using jsonpath, returning multiple items', function () {
        const { get } = jm.getters
        const result = get(storeRecord)('widget', '$[?(@.foo)]')
        expect(result).to.deep.equal(normRecord)
      })
      it('should filter results using jsonpath, returning no items', function () {
        const { get } = jm.getters
        const result = get(storeRecord)('widget', '$[?(@.nosuchkey)]')
        expect(result).to.deep.equal({})
      })
      it('should filter whole store using jsonpath, returning a single item', function () {
        const { get } = jm.getters
        // Return all records of any type with id: 1
        const result = get(storeRecord)('', '$.*.1')
        expect(result).to.deep.equal({
          [normWidget1['_jv']['id']]: normWidget1,
        })
      })
      it('should return empty object if type not in state', function () {
        const { get } = jm.getters
        const result = get({})('widget')
        expect(result).to.deep.equal({})
      })
      it('should follow relationships data (single item)', function () {
        jm = jsonapiModule(api, { followRelationshipsData: true })
        const { get } = jm.getters
        const result = get(storeRecord, { get: get })('widget/1')
        expect(result).to.have.all.keys(normWidget1Rels)
      })
      it('should follow relationships data (array)', function () {
        jm = jsonapiModule(api, { followRelationshipsData: true })
        const { get } = jm.getters
        const result = get(storeRecord, { get: get })('widget/2')
        expect(result).to.have.all.keys(normWidget2Rels)
      })
      it('should follow relationships data (array) for a collection', function () {
        jm = jsonapiModule(api, { followRelationshipsData: true })
        const { get } = jm.getters
        const result = get(storeRecord, { get: get })('widget')
        // Check 'sub-key' equality for each item in the collection
        for (let [key, val] of Object.entries(result)) {
          expect(val).to.have.all.keys(normRecordRels[key])
        }
      })
      it('should follow relationships data for the whole store', function () {
        jm = jsonapiModule(api, { followRelationshipsData: true })
        const { get } = jm.getters
        const result = get(storeRecord, { get: get })()
        // Check 'sub-key' equality for each item in the store (just test 'widget')
        for (let [key, val] of Object.entries(result['widget'])) {
          expect(val).to.have.all.keys(normRecordRels[key])
        }
      })
    })

    describe('getRelated', function () {
      it('should should add a property relName.<getter> to the root (single item)', function () {
        const { getRelated } = jm.getters
        // stub the getter function
        const res = getRelated(storeRecord, { get: sinon.stub() })('widget/1')
        expect(Object.getOwnPropertyDescriptor(res, 'widgets')).to.have.property('get')
      })
      it('should add a property relName.id.<getter> to the root (array)', function () {
        const { getRelated } = jm.getters
        // stub the getter function
        const res = getRelated(storeRecord, { get: sinon.stub() })('widget/2')
        for (let id of Object.keys(res['widgets'])) {
          expect(Object.getOwnPropertyDescriptor(res['widgets'], id)).to.have.property('get')
        }
      })
      it('should return an empty object for non-existent item (string)', function () {
        const { getRelated } = jm.getters
        const result = getRelated({})('none/1')
        expect(result).to.deep.equal({})
      })
      it('should return an empty object for non-existent item (object)', function () {
        const { getRelated } = jm.getters
        const result = getRelated({})({ _jv: { type: 'none', id: '1' } })
        expect(result).to.deep.equal({})
      })
      it('Should throw an error if passed an object with no type/id', async function () {
        const { getRelated } = jm.getters
        try {
          getRelated({})({ _jv: {} })
          // throw anyway to break the test suite if we reach this point
          throw 'Should have thrown an error (no id)'
        } catch (error) {
          expect(error).to.equal('No type/id specified')
        }
      })
    })
  }) // getters
})
