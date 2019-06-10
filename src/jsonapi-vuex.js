import Vue from 'vue'
import get from 'lodash.get'
import isEqual from 'lodash.isequal'
import merge from 'lodash.merge'
import cloneDeep from 'lodash.clonedeep'
// https://github.com/dchester/jsonpath/issues/89
import jp from 'jsonpath/jsonpath.min'

class RecordError extends Error {
  constructor(message, value) {
    super(message)
    this.value = value
  }
}

const STATUS_LOAD = 'LOADING'
const STATUS_SUCCESS = 'SUCCESS'
const STATUS_ERROR = 'ERROR'

let jvConfig = {
  // key to store jsonapi-vuex-related data under when destructuring
  jvtag: '_jv',
  // Follow relationships 'data' entries (from store)
  followRelationshipsData: true,
  // Preserve API response json in return data
  preserveJson: false,
  // Age of action status records to clean (in seconds). (0 disables).
  actionStatusCleanAge: 600,
  // Merge store records (or overwrite them)
  mergeRecords: false,
  // Delete old records not contained in an update (on a per-type basis).
  clearOnUpdate: false,
  // Only preserve new or modified attributes in a patch, compared to the store record.
  cleanPatch: false,
}

const jvtag = jvConfig['jvtag']

// Global sequence counter for unique action ids
let actionSequenceCounter = 0

const mutations = () => {
  return {
    deleteRecord: (state, record) => {
      const [type, id] = getTypeId(record)
      if (!type || !id) {
        throw new RecordError('deleteRecord: Missing type or id', record)
      }
      Vue.delete(state[type], id)
    },
    addRecords: (state, records) => {
      updateRecords(state, records)
    },
    replaceRecords: (state, records) => {
      updateRecords(state, records, false)
    },
    mergeRecords: (state, records) => {
      updateRecords(state, records, true)
    },
    clearRecords: (state, records) => {
      const newRecords = normToStore(records)
      for (let [type, item] of Object.entries(newRecords)) {
        if (type in state) {
          const storeRecords = get(state, [type])
          for (let id of Object.keys(storeRecords)) {
            if (!item.hasOwnProperty(id)) {
              Vue.delete(state[type], id)
            }
          }
        }
      }
    },
    setStatus: (state, { id, status }) => {
      Vue.set(state[jvtag], id, { status: status, time: Date.now() })
    },
    deleteStatus: (state, id) => {
      if (id in state[jvtag]) {
        Vue.delete(state[jvtag], id)
      }
    },
  }
}

const actions = (api) => {
  return {
    get: (context, args) => {
      const [data, config] = unpackArgs(args)
      const path = getURL(data)
      const apiConf = { method: 'get', url: path }
      // https://github.com/axios/axios/issues/362
      config['data'] = config['data'] || {}
      merge(apiConf, config)
      const actionId = actionSequence(context)
      context.commit('setStatus', { id: actionId, status: STATUS_LOAD })
      let action = api(apiConf)
        .then((results) => {
          processIncludedRecords(context, results)

          let resData = jsonapiToNorm(results.data.data)
          context.commit('addRecords', resData)
          if (jvConfig.clearOnUpdate) {
            context.commit('clearRecords', resData)
          }
          resData = checkAndFollowRelationships(context.state, resData)
          resData = preserveJSON(resData, results.data)
          context.commit('setStatus', {
            id: actionId,
            status: STATUS_SUCCESS,
          })
          return resData
        })
        .catch((error) => {
          context.commit('setStatus', { id: actionId, status: STATUS_ERROR })
          throw error
        })
      action[jvtag + 'Id'] = actionId
      return action
    },
    getRelated: (context, args) => {
      const data = unpackArgs(args)[0]
      let [, id, relName] = getTypeId(data)
      if (!id) {
        throw 'No id specified'
      }
      const actionId = actionSequence(context)
      context.commit('setStatus', { id: actionId, status: STATUS_LOAD })
      // We can't pass multiple/non-promise vars in a promise chain,
      // so must define such vars in a higher scope

      let relNames = []
      //Get initial record
      let action = context
        .dispatch('get', args)
        .then((record) => {
          let rels = get(record, [jvtag, 'relationships'], {})
          if (relName && rels) {
            // Only process requested relname
            rels = { [relName]: rels[relName] }
          }
          return rels
        })
        .catch((error) => {
          // Log and re-throw if 'get' action fails
          context.commit('setStatus', { id: actionId, status: STATUS_ERROR })
          throw error
        })
        .then((rels) => {
          // Store an array of relNames & promises
          // let relNames = []
          let relPromises = []
          // Iterate over all records in rels
          for (let [relName, relItems] of Object.entries(rels)) {
            let relData
            // Extract relationships from 'data' (type/id)
            if ('data' in relItems) {
              relData = relItems['data']
              if (!Array.isArray(relData)) {
                // Treat as if always an array
                relData = [relData]
              }
            } else if ('links' in relItems) {
              relData = relItems['links']['related']
              if (!(typeof relData === 'string')) {
                relData = relData['href']
              }
              relData = [relData]
            }
            for (let entry of relData) {
              // Rewrite 'data' objects to normalised form
              if (!(typeof entry === 'string')) {
                entry = { [jvtag]: entry }
              }
              relNames.push(relName)
              relPromises.push(context.dispatch('get', entry))
            }
          }
          // 'Merge' all promise resolution/rejection
          return Promise.all(relPromises)
        })
        .then((results) => {
          let related = {}
          results.forEach((result, i) => {
            // Get the relName from the same array position as the result item
            let relName = relNames[i]
            let normItem = {
              [relName]: {
                [result[jvtag]['type']]: {
                  [result[jvtag]['id']]: result,
                },
              },
            }
            merge(related, normItem)
          })
          context.commit('setStatus', {
            id: actionId,
            status: STATUS_SUCCESS,
          })
          return related
        })
        .catch((error) => {
          context.commit('setStatus', { id: actionId, status: STATUS_ERROR })
          throw error
        })
      action[jvtag + 'Id'] = actionId
      return action
    },
    post: (context, args) => {
      let [data, config] = unpackArgs(args)
      const path = getURL(data, true)
      const apiConf = { method: 'post', url: path, data: normToJsonapi(data) }
      merge(apiConf, config)
      const actionId = actionSequence(context)
      context.commit('setStatus', { id: actionId, status: STATUS_LOAD })
      let action = api(apiConf)
        .then((results) => {
          processIncludedRecords(context, results)

          // If the server handed back data, store it (to get id)
          // spec says 201, but some servers (wrongly) return 200
          if (results.status === 200 || results.status === 201) {
            data = jsonapiToNorm(results.data.data)
          }
          context.commit('addRecords', data)
          context.commit('setStatus', {
            id: actionId,
            status: STATUS_SUCCESS,
          })
          return preserveJSON(context.getters.get(data), results.data)
        })
        .catch((error) => {
          context.commit('setStatus', { id: actionId, status: STATUS_ERROR })
          throw error
        })
      action[jvtag + 'Id'] = actionId
      return action
    },
    patch: (context, args) => {
      let [data, config] = unpackArgs(args)
      data = cleanPatch(data, context.state)
      const path = getURL(data)
      const actionId = actionSequence(context)
      const apiConf = { method: 'patch', url: path, data: normToJsonapi(data) }
      merge(apiConf, config)
      context.commit('setStatus', { id: actionId, status: STATUS_LOAD })
      let action = api(apiConf)
        .then((results) => {
          // If the server handed back data, store it
          if (results.status === 200 && results.data.hasOwnProperty('data')) {
            // Full response
            context.commit('deleteRecord', data)
            data = jsonapiToNorm(results.data.data)
            context.commit('addRecords', data)
          } else {
            // 200 (meta-only), or 204 (no resource) response
            // Update the store record from the patch
            context.commit('mergeRecords', data)
          }

          // NOTE: We deliberately process included records after any `deleteRecord` mutations
          // to avoid deleting any included records that we just added.
          processIncludedRecords(context, results)

          context.commit('setStatus', {
            id: actionId,
            status: STATUS_SUCCESS,
          })
          return preserveJSON(context.getters.get(data), results.data)
        })
        .catch((error) => {
          context.commit('setStatus', { id: actionId, status: STATUS_ERROR })
          throw error
        })
      action[jvtag + 'Id'] = actionId
      return action
    },
    delete: (context, args) => {
      const [data, config] = unpackArgs(args)
      const path = getURL(data)
      const apiConf = { method: 'delete', url: path }
      merge(apiConf, config)
      const actionId = actionSequence(context)
      context.commit('setStatus', { id: actionId, status: STATUS_LOAD })
      let action = api(apiConf)
        .then((results) => {
          processIncludedRecords(context, results)

          context.commit('deleteRecord', data)
          context.commit('setStatus', {
            id: actionId,
            status: STATUS_SUCCESS,
          })
          if (results.data) {
            return preserveJSON(jsonapiToNorm(results.data.data), results.data)
          } else {
            return data
          }
        })
        .catch((error) => {
          context.commit('setStatus', { id: actionId, status: STATUS_ERROR })
          throw error
        })
      action[jvtag + 'Id'] = actionId
      return action
    },
    search: (context, args) => {
      // Create a 'noop' context.commit to avoid store modifications
      const nocontext = { commit: () => {} }
      // Use a new actions 'instance' instead of 'dispatch' to allow context override
      return actions(api).get(nocontext, args)
    },
    get fetch() {
      return this.get
    },
    get create() {
      return this.post
    },
    get update() {
      return this.patch
    },
  }
}

const getters = () => {
  return {
    get: (state) => (data, jsonpath) => {
      let result
      if (!data) {
        // No data arg - return whole state object
        result = state
      } else {
        const [type, id] = getTypeId(data)

        if (type in state) {
          if (id) {
            if (state[type].hasOwnProperty(id)) {
              // single item
              result = state[type][id]
            } else {
              // No item of that type
              return {}
            }
          } else {
            // whole collection, indexed by id
            result = state[type]
          }
          result = checkAndFollowRelationships(state, result)
        } else {
          // no records for that type in state
          return {}
        }
      }

      // Filter by jsonpath
      if (jsonpath) {
        const filtered = jp.query(result, jsonpath)
        if (Array.isArray(filtered)) {
          result = {}
          for (let item of filtered) {
            result[item[jvtag]['id']] = item
          }
        }
      }
      return result
    },
    status: (state) => (id) => {
      // If id is an object (promise), extract id
      if (typeof id === 'object') {
        id = id[jvtag + 'Id']
      }
      if (id in state[jvtag]) {
        return state[jvtag][id]['status']
      }
    },
  }
}

// Store Module
const jsonapiModule = (api, conf = {}) => {
  Object.assign(jvConfig, conf)

  let state = { [jvtag]: {} }

  return {
    namespaced: true,

    state: state,

    mutations: mutations(),
    actions: actions(api),
    getters: getters(),
  }
}

// Helper methods

const cleanPatch = (patch, state) => {
  if (!jvConfig.cleanPatch) {
    return patch
  }
  const stateRecord = get(state, patch[jvtag]['id'])
  if (!stateRecord) {
    return patch
  }
  const clean = {}
  // Get attrs (or if getter is missing, use all of patch object)
  const attrs = get(patch, [jvtag, 'attrs'], patch)
  for (let [k, v] of Object.entries(attrs)) {
    if (!stateRecord.hasOwnProperty(k) || !isEqual(stateRecord[k], v)) {
      clean[k] = v
    }
  }
  // Add back jvtag - in future we should also process the contents
  clean[jvtag] = stateRecord[jvtag]
  return clean
}

const updateRecords = (state, records, merging = jvConfig.mergeRecords) => {
  const storeRecords = normToStore(records)
  for (let [type, item] of Object.entries(storeRecords)) {
    if (!(type in state)) {
      Vue.set(state, type, {})
      // If there's no type, then there are no existing records to merge
      merging = false
    }
    for (let [id, data] of Object.entries(item)) {
      if (merging) {
        const oldRecord = get(state, [type, id])
        if (oldRecord) {
          data = merge(oldRecord, data)
        }
      }
      Vue.set(state[type], id, data)
    }
  }
}

const addJvHelpers = (obj) => {
  // Add Utility functions to _jv child object
  Object.assign(obj[jvtag], {
    isRel(name) {
      return get(obj, [jvtag, 'relationships'], {}).hasOwnProperty(name)
    },
    isAttr(name) {
      return name !== jvtag && obj.hasOwnProperty(name) && !this.isRel(name)
    },
  })
  // Use defineProperty as assign copies the values, not the getter function
  // https://github.com/mrichar1/jsonapi-vuex/pull/40#issuecomment-474560508
  Object.defineProperty(obj[jvtag], 'rels', {
    get() {
      const rel = {}
      for (let [key, val] of Object.entries(obj)) {
        if (this.isRel(key)) {
          rel[key] = val
        }
      }
      return rel
    },
  })
  Object.defineProperty(obj[jvtag], 'attrs', {
    get() {
      const att = {}
      for (let [key, val] of Object.entries(obj)) {
        if (key !== jvtag && !this.isRel(key)) {
          att[key] = val
        }
      }
      return att
    },
  })
  return obj
}

const actionSequence = (context) => {
  // Increment the global action id, set up a cleanup timeout and return it
  let id = ++actionSequenceCounter
  if (jvConfig.actionStatusCleanAge > 0) {
    setTimeout(
      context.commit,
      jvConfig.actionStatusCleanAge * 1000,
      'deleteStatus',
      id
    )
  }
  return id
}

// If enabled, store the response json in the returned data
const preserveJSON = (data, json) => {
  if (jvConfig.preserveJson && data) {
    if (!(jvtag in data)) {
      data[jvtag] = {}
    }
    // Store original json in _jv, then delete data section
    data[jvtag]['json'] = json
    delete data[jvtag]['json']['data']
  }
  return data
}

const checkAndFollowRelationships = (state, records, followState) => {
  if (jvConfig.followRelationshipsData) {
    followState = followState || {}
    let resData = {}
    if (jvtag in records) {
      // single item
      resData = followRelationships(state, records, followState)
    } else {
      // multiple items
      for (let [key, item] of Object.entries(records)) {
        resData[key] = followRelationships(state, item, followState)
      }
    }
    if (resData) {
      return resData
    }
  }
  return records
}

// Follow relationships and expand them into _jv/rels
const followRelationships = (state, record, followState) => {
  followState = followState || {}

  let [recordType, recordId] = getTypeId(record)
  // First check if we've already visited this object during recursion
  let local = get(followState, [recordType, recordId])
  if (local) {
    return local
  }
  if (!(recordType in followState)) {
    followState[recordType] = {}
  }

  // Copy item before modifying
  const data = cloneDeep(record)

  // Store cloned object in followState for future reuse during recursion
  followState[recordType][recordId] = data

  const relNames = get(data, [jvtag, 'relationships'], {})
  for (let [relName, relInfo] of Object.entries(relNames)) {
    let isItem = false
    // We can only work with data, not links since we need type & id
    if ('data' in relInfo && relInfo.data) {
      let relData = relInfo['data']
      data[relName] = {}
      if (!Array.isArray(relData)) {
        // Convert to an array to keep things DRY
        isItem = true
        relData = [relData]
      }
      for (let relItem of relData) {
        let [type, id] = getTypeId({ [jvtag]: relItem })
        let result = get(state, [type, id])
        if (result) {
          // Recursive call to follow children relationships
          result = followRelationships(state, result, followState)
          if (isItem) {
            // Store attrs directly under relName
            data[relName] = result
          } else {
            // Store attrs indexed by id
            data[relName][id] = result
          }
        }
      }
    }
  }
  return addJvHelpers(data)
}

// Make sure args is always an array of data and config
const unpackArgs = (args) => {
  if (Array.isArray(args)) {
    return args
  }
  return [args, {}]
}

// Get type, id, rels from a restructured object
const getTypeId = (data) => {
  let type, id, rel
  if (typeof data === 'string') {
    ;[type, id, rel] = data.replace(/^\//, '').split('/')
  } else {
    ;({ type, id } = data[jvtag])
  }
  // Strip any empty strings (falsey items)
  return [type, id, rel].filter(Boolean)
}

// Return path, or construct one if restructured data
const getURL = (data, post = false) => {
  let path = data
  if (typeof data === 'object') {
    if ('links' in data[jvtag] && 'self' in data[jvtag]['links'] && !post) {
      path = data[jvtag]['links']['self']
    } else {
      let { type, id } = data[jvtag]
      path = type
      // POST endpoints are always to collections, not items
      if (id && !post) {
        path += '/' + id
      }
    }
  }
  return path
}

// Normalize a single jsonapi item
const jsonapiToNormItem = (data) => {
  if (!data) {
    return {}
  }
  // Move attributes to top-level, nest original jsonapi under _jv
  const norm = Object.assign({ [jvtag]: data }, data['attributes'])
  // Create a new object omitting attributes
  const { attributes, ...normNoAttrs } = norm[jvtag] // eslint-disable-line no-unused-vars
  norm[jvtag] = normNoAttrs
  return norm
}

// Normalize one or more jsonapi items
const jsonapiToNorm = (data) => {
  const norm = {}
  if (Array.isArray(data)) {
    data.forEach((item) => {
      let { id } = item
      if (!(id in norm)) {
        norm[id] = {}
      }
      Object.assign(norm[id], jsonapiToNormItem(item))
    })
  } else {
    Object.assign(norm, jsonapiToNormItem(data))
  }
  return norm
}

// Denormalize an item to jsonapi
const normToJsonapiItem = (data) => {
  const jsonapi = {}
  //Pick out expected resource members, if they exist
  for (let member of ['id', 'type', 'relationships', 'meta', 'links']) {
    if (data[jvtag].hasOwnProperty(member)) {
      jsonapi[member] = data[jvtag][member]
    }
  }
  // User-generated data (e.g. post) has no helper methods
  if (data[jvtag].hasOwnProperty('attrs')) {
    jsonapi['attributes'] = data[jvtag].attrs
  } else {
    jsonapi['attributes'] = Object.assign({}, data)
    delete jsonapi['attributes'][jvtag]
  }
  return jsonapi
}

// Denormalize one or more records to jsonapi
const normToJsonapi = (record) => {
  const jsonapi = []
  if (!(jvtag in record)) {
    // Collection of id-indexed records
    for (let item of Object.values(record)) {
      jsonapi.push(normToJsonapiItem(item))
    }
  } else {
    jsonapi.push(normToJsonapiItem(record))
  }
  if (jsonapi.length === 1) {
    return { data: jsonapi[0] }
  } else {
    return { data: jsonapi }
  }
}

// Convert a norm record to store format
const normToStore = (record) => {
  let store = {}
  if (jvtag in record) {
    // Convert item to look like a collection
    record = { [record[jvtag]['id']]: record }
  }
  for (let item of Object.values(record)) {
    const { type, id } = item[jvtag]
    if (!(type in store)) {
      store[type] = {}
    }
    if (jvConfig.followRelationshipsData) {
      for (let rel in item[jvtag].rels) {
        delete item[rel]
      }
    }
    store[type][id] = item
  }
  return store
}

const processIncludedRecords = (context, results) => {
  if (get(results, ['data', 'included'])) {
    for (let item of results.data.included) {
      const includedItem = jsonapiToNormItem(item)
      context.commit('addRecords', includedItem)
    }
  }
}

// Export a single object with references to 'private' functions for the test suite
const _testing = {
  actionSequence: actionSequence,
  getTypeId: getTypeId,
  jsonapiToNorm: jsonapiToNorm,
  jsonapiToNormItem: jsonapiToNormItem,
  normToJsonapi: normToJsonapi,
  normToJsonapiItem: normToJsonapiItem,
  normToStore: normToStore,
  processIncludedRecords: processIncludedRecords,
  unpackArgs: unpackArgs,
  followRelationships: followRelationships,
  jvConfig: jvConfig,
  RecordError: RecordError,
  addJvHelpers: addJvHelpers,
  updateRecords: updateRecords,
  getURL: getURL,
  cleanPatch: cleanPatch,
}

// Export this module
export { jsonapiModule, _testing }
