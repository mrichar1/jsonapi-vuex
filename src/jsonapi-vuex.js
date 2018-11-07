import Vue from 'vue'
import merge from 'deepmerge'
// https://github.com/dchester/jsonpath/issues/89
import jp from 'jsonpath/jsonpath.min'

let jvConfig = {
  // key to store jsonapi-vuex-related data under when destructuring
  'jvtag': '_jv',
}

const jvtag = jvConfig['jvtag']

const mutations = (api) => {  // eslint-disable-line no-unused-vars
  return {
    delete_record: (state, record) => {
      const [ type, id ] = getTypeId(record)
      delete state[type][id]
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
      return api.get(path, config)
        .then((results) => {
          const res_data = jsonapiToNorm(results.data.data)
          context.commit('add_records', res_data)
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
      const [ data, config ] = unpackArgs(args)
      const type = getTypeId(data)[0]
      return api.post(type, normToJsonapi(data), config)
        .then(() => {
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
        .then(() => {
          context.commit('update_record', data)
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
        } else {
          // whole collection, indexed by id
          result = state[type]
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
  // Fastest way to deep copy
  const copy = JSON.parse(JSON.stringify(data))
  // Move attributes to top-level, nest original jsonapi under _jv
  const norm = Object.assign({ [jvtag]: copy }, copy['attributes'])
  delete norm[jvtag]['attributes']
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
    return jsonapi[0]
  } else {
    return jsonapi
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
