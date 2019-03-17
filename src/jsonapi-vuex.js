import Vue from 'vue'
import get from 'lodash.get';
import merge from 'lodash.merge';
import clone from 'lodash.clone';
// https://github.com/dchester/jsonpath/issues/89
import jp from 'jsonpath/jsonpath.min'

class RecordError extends Error {
  constructor(message, value) {
    super(message);
    this.value = value;
  }
}

const STATUS_LOAD = 'LOADING'
const STATUS_SUCCESS = 'SUCCESS'
const STATUS_ERROR = 'ERROR'

let jvConfig = {
  // key to store jsonapi-vuex-related data under when destructuring
  'jvtag': '_jv',
  // Follow relationships 'data' entries (from store)
  'follow_relationships_data': true,
  // Preserve API response json in return data
  'preserve_json': false,
  // Age of action status records to clean (in seconds). (0 disables).
  'action_status_clean_age': 600
}

const jvtag = jvConfig['jvtag']

// Global sequence counter for unique action ids
let action_sequence = 0

const mutations = (api) => {  // eslint-disable-line no-unused-vars
  return {
    delete_record: (state, record) => {
      const [ type, id ] = getTypeId(record)
      if (! type || ! id) {
        throw new RecordError("delete_record: Missing type or id", record)
      }
      Vue.delete(state[type], id)
    },
    add_records: (state, records) => {
      const store_records = normToStore(records)
      for (let [ type, item ] of Object.entries(store_records)) {
        for (let [ id, data ] of Object.entries(item)) {
          if (!(type in state)) {
            Vue.set(state, type, {})
          }
          Vue.set(state[type], id, data)
        }
      }
    },
    update_record: (state, new_record) => {
      const [ type, id ] = getTypeId(new_record)
      if (! type || ! id) {
        throw new RecordError("update_record: Missing type or id", new_record)
      }
      const store_record = normToStore(new_record)
      const old_record = get(state, [ type, id ])
      Vue.set(state[type], id, merge(old_record, store_record[type][id]))
    },
    set_status: (state, { id, status }) => {
      Vue.set(state[jvtag], id, { status: status, time: Date.now() })
    },
    delete_status: (state, id) => {
      if (id in state[jvtag]) {
        Vue.delete(state[jvtag], id)
      }
    }
  }
}

const actions = (api) => {
  return {
    get: (context, args) => {
      const [ data, config ] = unpackArgs(args)
      const path = getURL(data)
      // https://github.com/axios/axios/issues/362
      config['data'] = config['data'] || {}
      const action_id = actionSequence(context)
      context.commit('set_status', { id: action_id, status: STATUS_LOAD })
      let action = api.get(path, config)
        .then((results) => {
          // Process included records
          if ('included' in results.data) {
            for (let item of results.data.included) {
              const included_item = jsonapiToNormItem(item)
              context.commit('add_records', included_item)
            }
          }
          let res_data = jsonapiToNorm(results.data.data)
          context.commit('add_records', res_data)
          if (jvConfig.follow_relationships_data) {
            if (jvtag in res_data) {
              // single item
              res_data = followRelationships(context.state, res_data)
            } else {
              // multiple items
              for (let [ key, item ] of Object.entries(res_data)) {
                res_data[key] = followRelationships(context.state, item)
              }
            }
          }
          res_data = preserveJSON(res_data, results.data)
          context.commit('set_status', { id: action_id, status: STATUS_SUCCESS })
          return res_data
        })
        .catch((error) => {
          context.commit('set_status', { id: action_id, status: STATUS_ERROR })
          throw error
        })
        action[jvtag + '_id'] = action_id
        return action
    },
    getRelated: (context, args) => {
      const data = unpackArgs(args)[0]
      let [ , id, rel_name ] = getTypeId(data)
      if (!id) {
        throw "No id specified"
      }
      const action_id = actionSequence(context)
      context.commit('set_status', { id: action_id, status: STATUS_LOAD })
      // We can't pass multiple/non-promise vars in a promise chain,
      // so must define such vars in a higher scope

      let rel_names = []
      //Get initial record
      let action = context.dispatch('get', args)
        .then((record) => {
          let rels = get(record, [ jvtag, 'relationships' ]) || {}
          if (rel_name && rels) {
            // Only process requested relname
            rels = { [rel_name]: rels[rel_name] }
          }
          return rels
        })
        .catch((error) => {
          // Log and re-throw if 'get' action fails
          context.commit('set_status', { id: action_id, status: STATUS_ERROR })
          throw error
        })
        .then((rels) => {
          // Store an array of rel_names & promises
          // let rel_names = []
          let rel_promises = []
          // Iterate over all records in rels
          for (let [ rel_name, rel_items ] of Object.entries(rels)) {
            let rel_data
            // Extract relationships from 'data' (type/id)
            if ('data' in rel_items) {
              rel_data = rel_items['data']
              if (!(Array.isArray(rel_data))) {
                // Treat as if always an array
                rel_data = [ rel_data ]
              }
            } else if ('links' in rel_items) {
              rel_data = rel_items['links']['related']
              if (!(typeof rel_data === 'string')) {
                rel_data = rel_data['href']
              }
              rel_data = [ rel_data ]
            }
            for (let entry of rel_data) {
              // Rewrite 'data' objects to normalised form
              if (!(typeof entry === 'string')) {
                entry = { [jvtag]: entry }
              }
              rel_names.push(rel_name)
              rel_promises.push(context.dispatch('get', entry))
            }
          }
          // 'Merge' all promise resolution/rejection
          return Promise.all(rel_promises)
        })
        .then((results) => {
          let related = {}
          results.forEach((result, i) => {
            // Get the rel_name from the same array position as the result item
            let rel_name = rel_names[i]
            let norm_item = {
              [rel_name]: {
                [result[jvtag]['type']]: {
                  [result[jvtag]['id']]: result
                }
              }
            }
            merge(related, norm_item)
          })
          context.commit('set_status', { id: action_id, status: STATUS_SUCCESS })
          return related
        })
        .catch((error) => {
          context.commit('set_status', { id: action_id, status: STATUS_ERROR })
          throw error
        })
        action[jvtag + '_id'] = action_id
        return action
    },
    post: (context, args) => {
      let [ data, config ] = unpackArgs(args)
      const path = getURL(data, true)
      const action_id = actionSequence(context)
      context.commit('set_status', { id: action_id, status: STATUS_LOAD })
      let action = api.post(path, normToJsonapi(data), config)
        .then((results) => {
          // If the server handed back data, store it (to get id)
          // spec says 201, but some servers (wrongly) return 200
          if (results.status === 200 || results.status === 201) {
            data = jsonapiToNorm(results.data.data)
          }
          context.commit('add_records', data)
          context.commit('set_status', { id: action_id, status: STATUS_SUCCESS })
          return preserveJSON(context.getters.get(data), results.data)
        })
        .catch((error) => {
          context.commit('set_status', { id: action_id, status: STATUS_ERROR })
          throw error
        })
      action[jvtag + '_id'] = action_id
      return action
    },
    patch: (context, args) => {
      let [ data, config ] = unpackArgs(args)
      const path = getURL(data)
      const action_id = actionSequence(context)
      context.commit('set_status', { id: action_id, status: STATUS_LOAD })
      let action = api.patch(path, normToJsonapi(data), config)
        .then((results) => {
          // If the server handed back data, store it
          if (results.status === 200) {
            context.commit('delete_record', data)
            data = jsonapiToNorm(results.data.data)
            context.commit('add_records', data)
          } else if (results.status === 204) {
            // Otherwise, try to update the store record from the patch
            context.commit('update_record', data)
          }
          context.commit('set_status', { id: action_id, status: STATUS_SUCCESS })
          return preserveJSON(context.getters.get(data), results.data)
        })
        .catch((error) => {
          context.commit('set_status', { id: action_id, status: STATUS_ERROR })
          throw error
        })
      action[jvtag + '_id'] = action_id
      return action
    },
    delete: (context, args) => {
      const [ data, config ] = unpackArgs(args)
      const path = getURL(data)
      const action_id = actionSequence(context)
      context.commit('set_status', { id: action_id, status: STATUS_LOAD })
      let action = api.delete(path, config)
        .then((result) => {
          context.commit('delete_record', data)
          context.commit('set_status', { id: action_id, status: STATUS_SUCCESS })
          if (result.data) {
            return preserveJSON(jsonapiToNorm(result.data.data), result.data)
          } else {
            return data
          }
        })
        .catch((error) => {
          context.commit('set_status', { id: action_id, status: STATUS_ERROR })
          throw error
        })
      action[jvtag + '_id'] = action_id
      return action
    },
    get fetch () { return this.get },
    get create () { return this.post },
    get update () { return this.patch },
  }
}

const getters = (api) => {  // eslint-disable-line no-unused-vars
  return {
    get: (state) => (data, jsonpath) => {

      let result
      if (!data) {
        // No data arg - return whole state object
        result = state
      } else {
        const [ type, id ] = getTypeId(data)

        if (type in state) {
          if (id && id in state[type]) {
            // single item
            result = state[type][id]
            if (jvConfig.follow_relationships_data) {
              result = followRelationships(state, result)
            }
          } else {
            // whole collection, indexed by id
            result = state[type]
            if (jvConfig.follow_relationships_data) {
              let result_rels = {}
              for (let [ key, item ] of Object.entries(result)) {
                result_rels[key] = followRelationships(state, item)
              }
              result = result_rels
            }
          }
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
      if (typeof(id) === 'object') {
        id = id[jvtag + '_id']
      }
      if (id in state[jvtag]) {
        return state[jvtag][id]['status']
      }
    }
  }
}

// Store Module
const jsonapiModule = (api, conf = {}) => {

  Object.assign(jvConfig, conf)

  let state = { [jvtag]: {}}

  return {
    namespaced: true,

    state: state,

    mutations: mutations(api),
    actions: actions(api),
    getters: getters(api)
  }
}

// Helper methods

const actionSequence = (context) => {
  // Increment the global action id, set up a cleanup timeout and return it
  let id = ++action_sequence
  if (jvConfig.action_status_clean_age > 0) {
    setTimeout(context.commit, jvConfig.action_status_clean_age * 1000, 'delete_status', id)
  }
  return id
}

// If enabled, store the response json in the returned data
const preserveJSON = (data, json) => {
  if (jvConfig.preserve_json && data) {
    if (!(jvtag in data)) {
      data[jvtag] = {}
    }
    // Store original json in _jv, then delete data section
    data[jvtag]['json'] = json
    delete data[jvtag]['json']['data']
  }
  return data
}

// Follow relationships and expand them into _jv/rels
const followRelationships = (state, record) => {
  // Copy item before modifying
  const data = clone(record)
  data[jvtag]['rels'] = {}
  const rel_names = get(data, [ jvtag, 'relationships' ]) || {}
  for (let [ rel_name, rel_info ] of Object.entries(rel_names)) {
    let is_item = false
    // We can only work with data, not links since we need type & id
    if ('data' in rel_info && rel_info.data) {
      let rel_data = rel_info['data']
      data[jvtag]['rels'][rel_name] = {}
      if (!(Array.isArray(rel_data))) {
        // Convert to an array to keep things DRY
        is_item = true
        rel_data = [ rel_data ]
      }
      for (let rel_item of rel_data) {
        let [ type, id ] = getTypeId({ [jvtag]: rel_item })
        let result = get(state, [ type, id ])
        if (result) {
          // Copy rather than ref to avoid circular JSON issues
          result = clone(result)
          if (is_item) {
            // Store attrs directly under rel_name
            data[jvtag]['rels'][rel_name] = result
          } else {
            // Store attrs indexed by id
            data[jvtag]['rels'][rel_name][id] = result
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
  return [ args, {} ]
}

// Get type, id, rels from a restructured object
const getTypeId = (data) => {
  let type, id, rel
  if (typeof(data) === 'string') {
    [ type, id, rel ] = data.replace(/^\//, "").split("/")
  } else {
    ({ type, id } = data[jvtag])
  }
  // Strip any empty strings (falsey items)
  return [ type, id, rel ].filter(Boolean)
}

// Return path, or construct one if restructured data
const getURL = (data, post=false) => {
  let path = data
  if (typeof(data) === 'object') {
    let { type, id } = data[jvtag]
    path = type
    // POST endpoints are always to collections, not items
    if (id && !(post)) {
      path += "/" + id
    }
  }
  if (!(path.startsWith("/"))) {
    path = "/" + path
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
  const { attributes, ...norm_no_attrs } = norm[jvtag]  // eslint-disable-line no-unused-vars
  norm[jvtag] = norm_no_attrs
  return norm
}

// Normalize one or more jsonapi items
const jsonapiToNorm = (data) => {
  const norm = {}
  if (Array.isArray(data)) {
    data.forEach(item => {
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
  delete jsonapi['attributes'][jvtag]
  return jsonapi
}

// Denormalize one or more records to jsonapi
const normToJsonapi = (record) => {
  const jsonapi = []
  if (!(jvtag  in record)) {
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
    for (let item of Object.values(record))  {
      const { type, id } = item[jvtag]
      if (!(type in store)) {
        store[type] = {}
      }
      store[type][id] = item
    }
  } else {
    const { type, id } = record[jvtag]
    store = { [type]: { [id]: record }}
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
  normToJsonapiItem:normToJsonapiItem,
  normToStore: normToStore,
  unpackArgs: unpackArgs,
  followRelationships: followRelationships,
  jvConfig: jvConfig,
  RecordError: RecordError

}


// Export this module
export {
  jsonapiModule,
  _testing
}
