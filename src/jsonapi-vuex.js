import Vue from 'vue'
import get from 'lodash.get'
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
}

const jvtag = jvConfig['jvtag']

// Global sequence counter for unique action ids
let actionSequenceCounter = 0

const mutations = (/* api */) => {
  return {
    deleteRecord: (state, record) => {
      const [type, id] = getTypeId(record)
      if (!type || !id) {
        throw new RecordError('deleteRecord: Missing type or id', record)
      }
      Vue.delete(state[type], id)
    },
    addRecords: (state, records) => {
      const storeRecords = normToStore(records)
      for (let [type, item] of Object.entries(storeRecords)) {
        for (let [id, data] of Object.entries(item)) {
          if (!(type in state)) {
            Vue.set(state, type, {})
          }
          Vue.set(state[type], id, data)
        }
      }
    },
    updateRecord: (state, newRecord) => {
      const [type, id] = getTypeId(newRecord)
      if (!type || !id) {
        throw new RecordError('updateRecord: Missing type or id', newRecord)
      }
      const storeRecord = normToStore(newRecord)
      const oldRecord = get(state, [type, id])
      Vue.set(state[type], id, merge(oldRecord, storeRecord[type][id]))
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
      // https://github.com/axios/axios/issues/362
      config['data'] = config['data'] || {}
      const actionId = actionSequence(context)
      context.commit('setStatus', { id: actionId, status: STATUS_LOAD })
      let action = api
        .get(path, config)
        .then((results) => {
          // Process included records
          if ('included' in results.data) {
            for (let item of results.data.included) {
              const includedItem = jsonapiToNormItem(item)
              context.commit('addRecords', includedItem)
            }
          }
          let resData = jsonapiToNorm(results.data.data)
          context.commit('addRecords', resData)
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
          let rels = get(record, [jvtag, 'relationships']) || {}
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
      const actionId = actionSequence(context)
      context.commit('setStatus', { id: actionId, status: STATUS_LOAD })
      let action = api
        .post(path, normToJsonapi(data), config)
        .then((results) => {
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
      const path = getURL(data)
      const actionId = actionSequence(context)
      context.commit('setStatus', { id: actionId, status: STATUS_LOAD })
      let action = api
        .patch(path, normToJsonapi(data), config)
        .then((results) => {
          // If the server handed back data, store it
          if (results.status === 200) {
            context.commit('deleteRecord', data)
            data = jsonapiToNorm(results.data.data)
            context.commit('addRecords', data)
          } else if (results.status === 204) {
            // Otherwise, try to update the store record from the patch
            context.commit('updateRecord', data)
          }
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
      const actionId = actionSequence(context)
      context.commit('setStatus', { id: actionId, status: STATUS_LOAD })
      let action = api
        .delete(path, config)
        .then((result) => {
          context.commit('deleteRecord', data)
          context.commit('setStatus', {
            id: actionId,
            status: STATUS_SUCCESS,
          })
          if (result.data) {
            return preserveJSON(jsonapiToNorm(result.data.data), result.data)
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

const getters = (/* api */) => {
  return {
    get: (state) => (data, jsonpath) => {
      let result
      if (!data) {
        // No data arg - return whole state object
        result = state
      } else {
        const [type, id] = getTypeId(data)

        if (type in state) {
          if (id && id in state[type]) {
            // single item
            result = state[type][id]
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

    mutations: mutations(api),
    actions: actions(api),
    getters: getters(api),
  }
}

// Helper methods

const addJvHelpers = (obj) => {
  // Add Utility functions to _jv child object
  Object.assign(obj[jvtag], {
    is_rel(name) {
      return name in obj[jvtag]['relationships']
    },
    is_attr(name) {
      return name != '_jv' && !this.is_rel(name)
    },
    get rels() {
      const rel = {}
      for (let [key, val] of Object.entries(obj)) {
        if (key in obj[jvtag]['relationships']) {
          rel[key] = val
        }
      }
      return rel
    },
    get attrs() {
      const att = {}
      for (let [key, val] of Object.entries(obj)) {
        if (key != jvtag && !(key in obj[jvtag]['relationships'])) {
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
  const data = addJvHelpers(cloneDeep(record))

  // Store cloned object in followState for future reuse during recursion
  followState[recordType][recordId] = data

  const relNames = get(data, [jvtag, 'relationships']) || {}
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
  return data
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
    let { type, id } = data[jvtag]
    path = type
    // POST endpoints are always to collections, not items
    if (id && !post) {
      path += '/' + id
    }
  }
  if (!path.startsWith('/')) {
    path = '/' + path
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
  // Fastest way to deep copy
  const jsonapi = { ...data[jvtag] }
  jsonapi['attributes'] = Object.assign({}, data)

  delete jsonapi.rels
  delete jsonapi['attributes'][jvtag]

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
  if (!(jvtag in record)) {
    for (let item of Object.values(record)) {
      const { type, id } = item[jvtag]
      if (!(type in store)) {
        store[type] = {}
      }
      store[type][id] = item
    }
  } else {
    const { type, id } = record[jvtag]
    store = { [type]: { [id]: record } }
  }
  return store
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
  unpackArgs: unpackArgs,
  followRelationships: followRelationships,
  jvConfig: jvConfig,
  RecordError: RecordError,
}

// Export this module
export { jsonapiModule, _testing }
