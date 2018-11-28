import Vue from 'vue'
import merge from 'lodash.merge';
import clone from 'lodash.clone';
// https://github.com/dchester/jsonpath/issues/89
import jp from 'jsonpath/jsonpath.min'

let jvConfig = {
  // key to store jsonapi-vuex-related data under when destructuring
  'jvtag': '_jv',
  // Follow relationships 'data' entries (from store)
  'follow_relationships_data': true
}

const jvtag = jvConfig['jvtag']

const mutations = (api) => {  // eslint-disable-line no-unused-vars
  return {
    delete_record: (state, record) => {
      const [ type, id ] = getTypeId(record)
      if (! type || ! id) {
        throw("delete_record: Missing type or id" + type + ":" + id)
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
        throw("update_record: Missing type or id" + type + ":" + id)
      }
      const store_record = normToStore(new_record)
      const old_record = getNested(state, [ type, id ])
      Vue.set(state[type], id, merge(old_record, store_record[type][id]))
    }
  }
}

const actions = (api, conf = {}) => {
  Object.assign(jvConfig, conf)
  return {
    get: (context, args) => {
      const [ data, config ] = unpackArgs(args)
      const path = getTypeId(data).join('/')
      // https://github.com/axios/axios/issues/362
      config['data'] = config['data'] || {}
      return api.get(path, config)
        .then((results) => {
          // Process included records
          if ('included' in results.data) {
            const included_data = jsonapiToNorm(results.data.included)
            context.commit('add_records', included_data)
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
          return res_data
        })
        .catch((error) => {
          return error
        })
    },
    getRelated: async (context, args) => {
      let related = {}
      const data = unpackArgs(args)[0]
      let [ , id, rel ] = getTypeId(data)
      if (!id) {
        throw "No id specified"
      }
      const record = await context.dispatch('get', args)
      let rels = getNested(record, [ jvtag, 'relationships' ]) || {}
      if (rel && rels) {
        // Only process requested relname
        rels = { [rel]: rels[rel] }
      }
      for (let [ rel_name, rel_items ] of Object.entries(rels)) {
        if (!(rel_name in related)) {
          related[rel_name] = {}
        }
        if ('data' in rel_items) {
          let rel_data = rel_items['data']
          if (!(Array.isArray(rel_data))) {
            // Treat as if always an array
            rel_data = [ rel_data ]
          }
          for (let entry of rel_data) {
            const fetched = await context.dispatch('get', { [jvtag]: entry })
            const { type: rel_type, id: rel_id } = fetched[jvtag]
            if (!(rel_type in related[rel_name])) {
              related[rel_name][rel_type] = {}
            }
            Object.assign(related[rel_name][rel_type], { [rel_id]: fetched })
          }
        } else if ('links' in rel_items) {
          let rel_links = rel_items['links']['related']
          if (!(typeof rel_links === 'string')) {
            rel_links = rel_links['href']
          }
          const results = await api.get(rel_links, {})
          const res_data = jsonapiToNorm(results.data.data)
          const rel_type = res_data[jvtag]['type']
          const rel_id = res_data[jvtag]['id']
          context.commit('add_records', res_data)
          if (!(rel_type in related[rel_name])) {
            related[rel_name][rel_type] = {}
          }
          Object.assign(related[rel_name][rel_type], { [rel_id]: res_data })
        }
      }
      return related
    },
    post: (context, args) => {
      let [ data, config ] = unpackArgs(args)
      const type = getTypeId(data)[0]
      return api.post(type, normToJsonapi(data), config)
        .then((results) => {
        // If the server handed back data, store it (to get id)
          if (results.status === 201) {
            data = jsonapiToNorm(results.data.data)
          }
          context.commit('add_records', data)
          return context.getters.get(data)
        })
        .catch((error) => {
          return error
        })
    },
    patch: (context, args) => {
      const [ data, config ] = unpackArgs(args)
      const path = getTypeId(data).join('/')
      return api.patch(path, normToJsonapi(data), config)
        .then((results) => {
          // If the server handed back data, store it
          if (results.status === 200) {
            context.commit('delete_record', data)
            context.commit('add_records', jsonapiToNorm(results.data.data))
          } else if (results.status === 204) {
            // Otherwise, try to update the store record from the patch
            context.commit('update_record', data)
          }
          return context.getters.get(data)
        })
        .catch((error) => {
          return error
        })
    },
    delete: (context, args) => {
      const [ data, config ] = unpackArgs(args)
      const path = getTypeId(data).join('/')
      return api.delete(path, config)
        .then((result) => {
          context.commit('delete_record', data)
          return jsonapiToNorm(result.data.data)
        })
        .catch((error) => {
          return error
        })
    },
    get fetch () { return this.get },
    get create () { return this.post },
    get update () { return this.patch },
  }
}

const getters = (api) => {  // eslint-disable-line no-unused-vars
  return {
    get: (state) => (data, jsonpath) => {
      if (!data) {
        // No data arg - return whole state object
        return state
      }

      let result
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
    }
  }
}

// Store Module
const jsonapiModule = (api, conf) => {
  return {
    namespaced: true,

    state: {},

    mutations: mutations(api, conf),
    actions: actions(api, conf),
    getters: getters(api, conf)
  }
}

// Helper methods

// Follow relationships and expand them into _jv/rels
const followRelationships = (state, record) => {
  let is_item = false
  // Copy item before modifying
  const data = clone(record, true)
  data[jvtag]['rels'] = {}
  const rel_names = getNested(data, [ jvtag, 'relationships' ]) || {}
  for (let [ rel_name, rel_info ] of Object.entries(rel_names)) {
    // We can only work with data, not links since we need type & id
    if ('data' in rel_info) {
      let rel_data = rel_info['data']
      data[jvtag]['rels'][rel_name] = {}
      if (!(Array.isArray(rel_data))) {
        // Convert to an array to keep things DRY
        is_item = true
        rel_data = [ rel_data ]
      }
      for (let rel_item of rel_data) {
        let [ type, id ] = getTypeId({ [jvtag]: rel_item })
        let result = getNested(state, [ type, id ])
        if (result) {
          // Copy rather than ref to avoid circular JSON issues
          result = clone(result, true)
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

// Get type and id from data, either a string, or a restructured object
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

// Walk an object looking for children, returning undefined rather than an error
// Use: getNested('object', ['path', 'to', 'child'])
const getNested = (nestedObj, pathArray) => {
    return pathArray.reduce((obj, key) =>
        (obj && obj[key] !== 'undefined') ? obj[key] : undefined, nestedObj)
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
  getTypeId: getTypeId,
  jsonapiToNorm: jsonapiToNorm,
  jsonapiToNormItem: jsonapiToNormItem,
  normToJsonapi: normToJsonapi,
  normToJsonapiItem:normToJsonapiItem,
  normToStore: normToStore,
  unpackArgs: unpackArgs,
  jvConfig: jvConfig
}


// Export this module
export {
  jsonapiModule,
  _testing
}
