import { afterEach, beforeEach, describe, expect, test } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import sinonChai from 'sinon-chai'
import sinon from 'sinon'
import chai from 'chai'
chai.use(sinonChai)

import { makeApi } from './server'
let api, mockApi

import defaultJsonapiStore from './utils/defaultJsonapiStore.js'
import {
  jsonFormat as createJsonWidget1,
  normFormat as createNormWidget1,
  normFormatPatch as createNormWidget1Patch,
  normFormatUpdate as createNormWidget1Update,
  storeFormat as createStoreWidget1,
} from './fixtures/widget1.js'
import { jsonFormat as createJsonWidget2 } from './fixtures/widget2.js'
import { normFormat as createNormWidget2 } from './fixtures/widget2.js'
import { normFormat as createNormWidget3 } from './fixtures/widget3.js'
import {
  jsonFormat as createJsonRecord,
  normFormatWithRels as createNormRecordRels,
  storeFormat as createStoreRecord,
} from './fixtures/record.js'

// 'global' variables (redefined in beforeEach)
let jsonWidget1,
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
  store,
  status,
  config,
  utils,
  storeWidget1,
  storeWidget1Update,
  storeWidgetSpecialChars,
  storeRecord

beforeEach(function () {
  ;[api, mockApi] = makeApi()

  // Remove mock handlers
  mockApi.reset()

  // Set up commonly used data objects

  setActivePinia(createPinia())
  let jStore = defaultJsonapiStore(api)
  store = jStore.jsonapiStore()
  config = jStore.config
  status = jStore.status
  utils = jStore.utils

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
  test('should export jsonapiStore', function () {
    expect(defaultJsonapiStore).to.exist
  })

  describe('jsonapiStore mutations', function () {
    describe('deleteRecord', function () {
      test('should delete a record (data) from the Vue store', function () {
        store.$patch(storeWidget1)
        store.deleteRecord(normWidget1)
        expect(store.$state.widget).to.not.have.key(normWidget1['_jv']['id'])
      })
      test('should delete a record (string) from the store', function () {
        // Leading slash is incorrect syntax, but we should handle it so test with it in
        store.$patch(storeWidget1)
        store.deleteRecord('widget/1')
        expect(store.$state.widget).to.not.have.key(1)
      })
      test('should delete a record (string) from the store without url-encoding it', function () {
        store.$patch({
          widget: {
            'hello:world': { _jv: { type: 'widget', id: 'hello:world' } },
          },
        })
        store.deleteRecord('widget/hello:world')
        expect(store.$state.widget).to.not.have.key('hello:world')
      })
      test('should throw an error if no type or id present.', function () {
        // expect needs a function to call, not the return from a function
        expect(() => store.deleteRecord(storeWidget1, { _jv: {} })).to.throw(utils.RecordError)
      })
      test('should not throw an error if trying to delete an object not in the store.', function () {
        // expect needs a function to call, not the return from a function
        store.deleteRecord({ _jv: { type: 'nosuchtype', id: '999' } })
      })
    })

    describe('mergeRecords', function () {
      test('should update a record in the store (merge)', function () {
        let { jsonapiStore } = defaultJsonapiStore(api, { mergeRecords: true }, 'tmp')
        store = jsonapiStore()
        store.$patch(storeWidget1)
        store.mergeRecords(normWidget1Patch)
        storeWidget1Update._jv = {}
        expect(store.$state).to.deep.equal(storeWidget1Update)
      })
    })

    describe('replaceRecords', function () {
      test('should add several records to the store (replace)', function () {
        // Put an object into state that should get replaced
        store.$patch(storeWidget1Update)
        store.replaceRecords(normRecord)
        // Add 'root' _jv
        storeRecord._jv = {}
        expect(store.$state).to.deep.equal(storeRecord)
      })
    })

    describe('addRecords', function () {
      test('should add several records to the store (replace)', function () {
        // Put an object into state that should get replaced
        store.$patch(storeWidget1Update)
        store.addRecords(normRecord)
        // Add 'root' _jv
        storeRecord._jv = {}
        expect(store.$state).to.deep.equal(storeRecord)
      })
      test('should update a record in the store (merge)', function () {
        let { jsonapiStore } = defaultJsonapiStore(api, { mergeRecords: true }, 'tmp')
        store = jsonapiStore()
        store.$patch(storeWidget1)
        // Add 'root' _jv
        storeWidget1Update._jv = {}
        store.addRecords(normWidget1Patch)
        expect(store.$state).to.deep.equal(storeWidget1Update)
      })
    })

    describe('clearRecords', function () {
      test('should remove records from the store not in the response (clearOnUpdate)', function () {
        store.$patch({ widget: { 1: {}, 999: {} } })
        store.clearRecords(normRecord)
        // '1' is in normRecord, so should still be present in state
        expect(store.$state['widget']).to.have.property('1')
        // '999' not in normRecord, so should no longer be present in state
        expect(store.$state['widget']).to.not.have.property('999')
      })
    })
  }) // mutations

  describe('jsonapiStore helpers', function () {
    describe('deepCopy', function () {
      test('should deep copy an object, replacing helper methods', function () {
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
      test('should return the object as-is if empty.', function () {
        let obj = {}
        let newObj = utils.deepCopy(obj)
        expect(newObj).to.deep.equal({})
      })
    })
    describe('_copy', function () {
      test('should recursively (deep) copy simple objects', function () {
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
      test('should return patch unmodified if record not in state', function () {
        // Remove isData as clean Patch will have removed it
        delete normWidget1Patch._jv.isData
        const res = utils.cleanPatch(normWidget1Patch, {})
        expect(res).to.deep.equal(normWidget1Patch)
      })
      test('should pick modified/new attributes from a record (no _jv)', function () {
        const res = utils.cleanPatch(normWidget1Patch, { widget: normRecord })
        expect(res).to.not.have.property('bar')
        expect(res['foo']).to.equal('update')
      })
      test('should pick modified/new attributes from a record (with _jv)', function () {
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
      test('should add several records to the store (replace)', function () {
        // Put an object into state that should get replaced
        store.$patch(storeWidget1Update)
        utils.updateRecords(store, normRecord, false)
        // Add root '_jv'
        storeRecord._jv = {}
        expect(store.$state).to.deep.equal(storeRecord)
      })
      test('should add several records to the store (merge)', function () {
        store.$patch(storeWidget1)
        utils.updateRecords(store, normWidget1Patch, true)
        // Add root '_jv'
        storeWidget1Update._jv = {}
        expect(store.$state).to.deep.equal(storeWidget1Update)
      })
      test('should not error if no type(s) in state', function () {
        // Ensures coverage for if (!(type in state))
        utils.updateRecords(store, normRecord, true)
        // Add root '_jv'
        storeRecord._jv = {}
        expect(store.$state).to.deep.equal(storeRecord)
      })
      test('should not alter existing records in the store', function () {
        // Add a test record to the store
        store.$patch({ widget: { 4: { foo: 4 } } })
        utils.updateRecords(store, normRecord)
        // test record should stil exist
        expect(store.$state.widget).to.have.property('4')
      })
    })

    describe('getIncludedRecords', function () {
      test('should process included records', function () {
        jsonWidget1['included'] = [jsonWidget2]
        utils.getIncludedRecords({ data: jsonWidget1 })
        //expect(store.mergeRecords).to.have.been.called
      })
    })

    describe('utils.getTypeId', function () {
      test('should get type & id from string', function () {
        expect(utils.getTypeId('widget/1')).to.deep.equal(['widget', '1'])
      })
      test('should get type only from string', function () {
        expect(utils.getTypeId('widget')).to.deep.equal(['widget'])
      })
      test('should not get type & id from a full URL', function () {
        expect(utils.getTypeId('https://www.example.com/api/widget')).to.deep.equal([])
      })
      test('should get type, id & relname from string', function () {
        expect(utils.getTypeId('widget/1/relname')).to.deep.equal(['widget', '1', 'relname'])
      })
      test('should get type & id from norm data', function () {
        expect(utils.getTypeId(normWidget1)).to.deep.equal(['widget', '1'])
      })
      test('should get type only from norm data', function () {
        delete normWidget1['_jv']['id']
        expect(utils.getTypeId(normWidget1)).to.deep.equal(['widget'])
      })
      test('should uri encode type and/or id', function () {
        const urlWidget = {
          _jv: {
            type: '/#',
            id: '? &',
          },
        }
        expect(utils.getTypeId(urlWidget)).to.deep.equal(['%2F%23', '%3F%20%26'])
      })
      test('should not uri encode type and/or id if encode=false', function () {
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
      test('should convert jsonapi to normalized for a single item', function () {
        expect(utils.jsonapiToNormItem(jsonWidget1)).to.deep.equal(normWidget1)
      })
      test("should preserve deeply nested '_jv' keys", function () {
        expect(utils.jsonapiToNormItem(jsonWidget1)).to.deep.equal(normWidget1)
      })
      test("should set the 'isIncluded' property if isIncluded param is true", function () {
        // Set isIncluded param to true, drop isData
        normWidget1._jv.isIncluded = true
        delete normWidget1._jv.isData
        expect(utils.jsonapiToNormItem(jsonWidget1, 'isIncluded')).to.deep.equal(normWidget1)
      })
    })

    describe('utils.jsonapiToNorm', function () {
      test('should convert jsonapi to normalized for a single item', function () {
        expect(utils.jsonapiToNorm(jsonWidget1)).to.deep.equal(normWidget1)
      })

      test('should convert jsonapi to normalized for an array of records', function () {
        expect(utils.jsonapiToNorm(jsonRecord['data'])).to.deep.equal(normRecord)
      })

      test('should return an empty object if input is undefined', function () {
        expect(utils.jsonapiToNorm(undefined)).to.deep.equal({})
      })
    })

    describe('utils.normToJsonapi', function () {
      test('should convert normalized to jsonapi for multiple items', function () {
        expect(utils.normToJsonapi(normRecord)).to.deep.equal(jsonRecord)
      })

      test('should convert normalized to jsonapi for a single item', function () {
        expect(utils.normToJsonapi(normWidget1)).to.deep.equal({
          data: jsonWidget1,
        })
      })
    })

    describe('utils.normToJsonapiItem', function () {
      test('should convert normalized to jsonapi for a single item', function () {
        expect(utils.normToJsonapiItem(normWidget1)).to.deep.equal(jsonWidget1)
      })
      test('should convert normalized to jsonapi with root rels', function () {
        let { utils } = defaultJsonapiStore(api, { followRelationshipsData: true }, 'tmp')
        // Add JvHelper methods to object
        normWidget1Rels = utils.addJvHelpers(normWidget1Rels)
        expect(utils.normToJsonapiItem(normWidget1Rels)).to.deep.equal(jsonWidget1)
      })
      test('should convert normalized to jsonapi for a single item with no id (POST)', function () {
        delete normWidget1['_jv']['id']
        delete jsonWidget1['id']
        expect(utils.normToJsonapiItem(normWidget1)).to.deep.equal(jsonWidget1)
      })
    })

    describe('utils.normToStore', function () {
      test('should convert normalized to store', function () {
        expect(utils.normToStore(normRecord)).to.deep.equal(storeRecord)
      })
      test('should convert normalized to store for a single item', function () {
        expect(utils.normToStore(normWidget1)).to.deep.equal(storeWidget1)
      })
      test('should convert normalized item to store, removing rels from root', function () {
        let { utils } = defaultJsonapiStore(api, { followRelationshipsData: true }, 'tmp')
        normWidget1Rels = utils.addJvHelpers(normWidget1Rels)
        expect(utils.normToStore(normWidget1Rels)).to.have.all.keys(storeWidget1)
      })
      test('should convert normalized records to store, removing rels from root', function () {
        let { utils }  = defaultJsonapiStore(api, { followRelationshipsData: true }, 'tmp')
        for (let item of Object.values(normRecordRels)) {
          item = utils.addJvHelpers(item)
        }
        expect(utils.normToStore(normRecordRels)).to.have.all.keys(storeRecord)
      })
    })
    describe('utils.unpackArgs', function () {
      test('Should convert a single arg into an array with empty config', function () {
        expect(utils.unpackArgs('splat')).to.deep.equal(['splat', {}])
      })
      test('Should leave an args array as-is', function () {
        expect(utils.unpackArgs(['splat', {}])).to.deep.equal(['splat', {}])
      })
    })

    describe('followRelationships', function () {
      test('should add a property relName.<getter> to the root (single item)', function () {
        store.$patch(storeRecord)
        let rels = utils.followRelationships(store, normWidget1)
        // Test if the the relName value is a getter
        expect(Object.getOwnPropertyDescriptor(rels, 'widgets')).to.have.property('get')
      })
      test('should add a property relName.id.<getter> to the root (array)', function () {
        store.$patch(storeRecord)
        let rels = utils.followRelationships(store, normWidget2)
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
      test('Should add methods to an objects _jv object', function () {
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
      test('Should list all object attributes', function () {
        const attrs = normWidget1['_jv'].attrs
        // throw away all but attrs
        delete normWidget1['_jv']
        expect(attrs).to.have.all.keys(normWidget1)
      })
      test('Should list all object rels', function () {
        const rels = normWidget1Rels['_jv'].rels
        expect(rels).to.have.all.keys(normWidget1Rels['_jv']['relationships'])
      })
      test('Should return true/false with isAttr', function () {
        for (let attr of Object.keys(normWidget1)) {
          if (attr !== '_jv') {
            expect(normWidget1['_jv'].isAttr(attr)).to.be.true
          }
        }
        expect(normWidget1['_jv'].isAttr('no_such_attr')).to.be.false
      })
      test('Should return true/false with isRel', function () {
        for (let rel of Object.keys(normWidget1['_jv']['relationships'])) {
          expect(normWidget1['_jv'].isRel(rel)).to.be.true
        }
        expect(normWidget1['_jv'].isRel('no_such_rel')).to.be.false
      })
    })

    describe('getURL function', function () {
      test('returns the path if a path is provided', function () {
        expect(utils.getURL('a/path')).to.equal('a/path')
      })
      describe('on objects', function () {
        describe('without links.self', function () {
          test('computes a path from type and id', function () {
            expect(utils.getURL(normWidget2)).to.equal('widget/2')
          })
        })
        describe('with links.self', function () {
          test('uses the URL', function () {
            expect(utils.getURL(normWidget1)).to.equal('/weirdPath/1')
          })
        })
      })
    })
    describe('utils.getRelationships', function () {
      test('should add a getter for a relationship (single item)', function () {
        let rels = utils.getRelationships(store, normWidget1)
        // Test if the the relName value is a getter
        expect(Object.getOwnPropertyDescriptor(rels, 'widgets')).to.have.property('get')
      })
      test('Should add a getter for a relationship (array)', function () {
        let rels = utils.getRelationships(store, normWidget2)
        // Test if the the relName value is a getter
        for (let id of Object.keys(rels['widgets'])) {
          expect(Object.getOwnPropertyDescriptor(rels['widgets'], id)).to.have.property('get')
        }
      })
      // FIXME: Can't stub getters in pinia (yet?)
      test.skip('Should not limit recursion (recurseRelationships)', function () {
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
      // FIXME: Can't stub getters in pinia (yet?)
      test.skip('Should limit recursion (!recurseRelationships)', function () {
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
      test('_count should increment counter', function () {
        expect(status.counter).to.equal(0)
        status._count()
        expect(status.counter).to.equal(1)
      })
      test('maxID should limit counter', function () {
        status.maxID = 5
        status.counter = 5
        status._count()
        expect(status.counter).to.equal(1)
      })
      test('should return a promise with an ID', async function () {
        const prom = status.run(() => Promise.resolve())
        await prom
        expect(prom).to.have.property('_statusID')
      })
      test('should show success on completion', async function () {
        const prom = status.run(() => Promise.resolve())
        await prom
        // success value = 1
        expect(status.status).to.deep.equal({ [prom['_statusID']]: 1 })
      })
      test('should show error on completion', async function () {
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
      test('should have a modified success value', async function () {
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

  describe('jsonapiStore getters', function () {
    describe('getData', function () {
      test('should return all state', function () {
        store.$patch(storeRecord)
        const result = store.getData()
        // Ignore 'root' _jv
        delete result._jv
        expect(result).to.deep.equal(storeRecord)
      })
      test('should return all state for a single endpoint', function () {
        store.$patch(storeRecord)
        const result = store.getData({ _jv: { type: 'widget' } })
        expect(result).to.deep.equal(normRecord)
      })
      test('should return all state for a single endpoint with a single record', function () {
        store.$patch(storeWidget1)
        const result = store.getData({ _jv: { type: 'widget' } })
        expect(result).to.deep.equal(storeWidget1['widget'])
      })
      test('should return a single id from state', function () {
        store.$patch(storeWidget1)
        const result = store.getData({
          _jv: { type: 'widget', id: '1' },
        })
        expect(result).to.deep.equal(normWidget1)
      })
      test('should return nothing for a non-existent type', function () {
        store.$patch(storeRecord)
        const result = store.getData({
          _jv: { type: 'nosuchtype' },
        })
        expect(result).to.deep.equal({})
      })
      test('should return nothing for a non-existent id', function () {
        store.$patch(storeWidget1)
        const result = store.getData({
          _jv: { type: 'widget', id: '999' },
        })
        expect(result).to.deep.equal({})
      })
      test('should accept a string path to object', function () {
        store.$patch(storeWidget1)
        const result = store.getData('widget/1')
        expect(result).to.deep.equal(normWidget1)
      })
      test('should accept a string path with special chars without url-encoding', function () {
        store.$patch(storeWidgetSpecialChars)
        const result = store.getData('widget/# ?')
        expect(result).to.deep.equal(normWidget1)
      })
      test('should filter results using jsonpath, returning a single item', function () {
        store.$patch(storeRecord)
        const result = store.getData('widget', '$[?(@.bar=="baz")]')
        expect(result).to.deep.equal({
          [normWidget1['_jv']['id']]: normWidget1,
        })
      })
      test('should filter results using jsonpath, returning multiple items', function () {
        store.$patch(storeRecord)
        const result = store.getData('widget', '$[?(@.foo)]')
        expect(result).to.deep.equal(normRecord)
      })
      test('should filter results using jsonpath, returning no items', function () {
        store.$patch(storeRecord)
        const result = store.getData('widget', '$[?(@.nosuchkey)]')
        expect(result).to.deep.equal({})
      })
      test('should filter whole store using jsonpath, returning a single item', function () {
        store.$patch(storeRecord)
        // Return all records of any type with id: 1
        const result = store.getData('', '$.*.1')
        expect(result).to.deep.equal({
          [normWidget1['_jv']['id']]: normWidget1,
        })
      })
      test('should return empty object if type not in state', function () {
        const result = store.getData('widget')
        expect(result).to.deep.equal({})
      })
      test('should follow relationships data (single item)', function () {
        let { jsonapiStore } = defaultJsonapiStore(api, { followRelationshipsData: true }, 'tmp')
        store = jsonapiStore()
        store.$patch(storeRecord)
        const result = store.getData('widget/1')
        expect(result).to.have.all.keys(normWidget1Rels)
      })
      test('should follow relationships data (array)', function () {
        let { jsonapiStore } = defaultJsonapiStore(api, { followRelationshipsData: true }, 'tmp')
        store = jsonapiStore()
        store.$patch(storeRecord)
        const result = store.getData('widget/2')
        expect(result).to.have.all.keys(normWidget2Rels)
      })
      test('should follow relationships data (array) for a collection', function () {
        let { jsonapiStore } = defaultJsonapiStore(api, { followRelationshipsData: true }, 'tmp')
        store = jsonapiStore()
        store.$patch(storeRecord)
        const result = store.getData('widget')
        // Check 'sub-key' equality for each item in the collection
        for (let [key, val] of Object.entries(result)) {
          expect(val).to.have.all.keys(normRecordRels[key])
        }
      })
      test('should follow relationships data for the whole store', function () {
        let { jsonapiStore } = defaultJsonapiStore(api, { followRelationshipsData: true }, 'tmp')
        store = jsonapiStore()
        store.$patch(storeRecord)
        const result = store.getData()

        // Check 'sub-key' equality for each item in the store (just test 'widget')
        for (let [key, val] of Object.entries(result['widget'])) {
          expect(val).to.have.all.keys(normRecordRels[key])
        }
      })
    })

    describe('getRelated', function () {
      test('should should add a property relName.<getter> to the root (single item)', function () {
        store.$patch(storeRecord)
        const res = store.getRelatedData('widget/1')
        expect(Object.getOwnPropertyDescriptor(res, 'widgets')).to.have.property('get')
      })
      test('should add a property relName.id.<getter> to the root (array)', function () {
        store.$patch(storeRecord)
        const res = store.getRelatedData('widget/2')
        for (let id of Object.keys(res['widgets'])) {
          expect(Object.getOwnPropertyDescriptor(res['widgets'], id)).to.have.property('get')
        }
      })
      test('should return an empty object for non-existent item (string)', function () {
        const result = store.getRelatedData('none/1')
        expect(result).to.deep.equal({})
      })
      test('should return an empty object for non-existent item (object)', function () {
        const result = store.getRelatedData({ _jv: { type: 'none', id: '1' } })
        expect(result).to.deep.equal({})
      })
      test('Should throw an error if passed an object with no type/id', async function () {
        try {
          store.getRelatedData({ _jv: {} })
          // throw anyway to break the test suite if we reach this point
          throw 'Should have thrown an error (no id)'
        } catch (error) {
          expect(error).to.equal('No type/id specified')
        }
      })
    })
  }) // getters
})
