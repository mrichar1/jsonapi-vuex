import Vue from 'vue'
import merge from 'deepmerge';
// https://github.com/dchester/jsonpath/issues/89
import jp from 'jsonpath/jsonpath.min'


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

const actions = (api) => {
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
      const record = context.dispatch('get', args)
      let rels = getNested(record, [ '_jv', 'relationships' ]) || {}
      if (rel && rels) {
        // Only process requested relname
        rels = { [rel]: rels[rel] }
      }
      for (let [ rel_name, rel_items ] of Object.entries(rels)) {
        if ('data' in rel_items) {
          let rel_data = rel_items['data']
          if (!(Array.isArray(rel_data))) {
            // Treat as if always an array
            rel_data = [ rel_data ]
          }
          for (let entry of rel_data) {
            const fetched = context.dispatch('get', { '_jv': entry })
            const { type: rel_type, id: rel_id } = fetched['_jv']
            if (!(rel_name in related)) {
              related[rel_name] = {}
            }
            if (!(rel_type in related[rel_name])) {
              related[rel_name][rel_type] = {}
            }
            Object.assign(related[rel_name][rel_type], { [rel_id]: fetched })
          }
        } else {
          // FIXME: handle related links
          // rel_link = getNested(rels, [ 'links', 'related' ])
        }
      }
      return related
      // new Promise((resolve, reject) => {
        //  resolve(related)
        //  reject()
      //  })

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
          // single item, indexed by id
          result = { id: state[type][id] }
        } else {
          // whole collection
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
            result[item['_jv']['id']] = item
          }
        }
      }
      // Prune index id if only 1 item
      const keys = Object.keys(result)
      if (keys.length === 1) {
        result = result[keys[0]]
      }
      return result
    }
  }
}

// Store Module
const jsonapiModule = (api) => {
  return {
    namespaced: true,

    state: {},

    mutations: mutations(api),
    actions: actions(api),
    getters: getters(api)
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
    ({ type, id } = data['_jv'])
  }
  if (rel) {
    return [ type, id, rel ]
  } else {
    return [ type, id ]
  }
}

// Walk an object looking for children, returning undefined rather than an error
// Use: getNested('object', ['path', 'to', 'child'])
const getNested = (nestedObj, pathArray) => {
    return pathArray.reduce((obj, key) =>
        (obj && obj[key] !== 'undefined') ? obj[key] : undefined, nestedObj);
}

// Normalize a single jsonapi item
const jsonapiToNormItem = (data) => {
  if (!data) {
    return {}
  }
  // Fastest way to deep copy
  const copy = JSON.parse(JSON.stringify(data))
  // Move attributes to top-level, nest original jsonapi under _jv
  const norm = Object.assign({ '_jv': copy }, copy['attributes'])
  delete norm['_jv']['attributes']
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
  const jsonapi = { ...data['_jv'] }
  jsonapi['attributes'] = Object.assign({}, data)
  delete jsonapi['attributes']['_jv']
  return jsonapi
}

// Denormalize one or more records to jsonapi
const normToJsonapi = (record) => {
  const jsonapi = []
  if (!('_jv'  in record)) {
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
  if (!('_jv' in record)) {
    for (let item of Object.values(record))  {
      const { type, id } = item['_jv']
      if (!(type in store)) {
        store[type] = {}
      }
      store[type][id] = item
    }
  } else {
    const { type, id } = record['_jv']
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
  unpackArgs: unpackArgs
}


// Export this module
export {
  jsonapiModule,
  _testing
}
