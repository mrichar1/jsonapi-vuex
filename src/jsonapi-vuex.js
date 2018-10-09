import Vue from 'vue'
import merge from 'deepmerge';

const mutations = (api) => {  // eslint-disable-line no-unused-vars
  return {
    delete_record: (state, record) => {
      let type, id
      if (typeof record === 'string') {
        [type, id] = record.replace(/^\//, "").split("/")
      } else {
        ({ type, id } = record['_jv'])
      }
      delete state.records[type][id]
    },
    update_record: (state, new_records) => {
      const { records } = state
      const store_records = normToStore(new_records)
      for (let [type, item] of Object.entries(store_records)) {
        for (let [id, data] of Object.entries(item)) {
          const old_record = getNested(state.records, [type, id])
          if (old_record) {
            Vue.set(records[type], id, merge(old_record, data))
          } else {
            if (!(type in records)) {
              records[type] = {}
            }
            Vue.set(records[type], id, data)
          }
        }
      }
    }
  }
}

const actions = (api) => {
  return {
    get: ({ commit }, options) => {
      let path
      if (typeof options === 'string') {
        path = options
      } else {
        const { type, id } = options['_jv']
        path = type + "/" + id
      }
      return api.get(path)
        .then((results) => {
          commit('update_record', jsonapiToNorm(results.data.data))
          return results
        })
        .catch((error) => {
          return error
        })
    },
    post: ({ commit }, options) => {
      const { type, id } = options['_jv']
      let path= type
      if (id) {
        path += "/" + id
      }
      return api.post(path, options)
        .then((results) => {
          commit('update_record', options)
          return results
        })
        .catch((error) => {
          return error
        })
    },
    patch: ({ commit }, options) => {
      const { type, id } = options['_jv']
      let path = type + "/" + id
      return api.patch(path, options)
        .then((results) => {
          commit('update_record', options)
          return results
        })
        .catch((error) => {
          return error
        })
    },
    delete: ({ commit }, options) => {
      let path
      if (typeof options === 'string') {
        // Use string as a verbatim path for api request
        path = options
      } else {
        const { type, id } = options['_jv']
        path = type + "/" + id
      }
      return api.delete(path)
        .then((results) => {
          commit('delete_record', options)
          return results
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
  // FIXME: get item/collection
  return {}
}

// Store Module
const jsonapiModule = (api) => {
  return {
    namespaced: true,

    state: {
      records: {}
    },

    mutations: mutations(api),
    actions: actions(api),
    getters: getters(api)
  }
}

// Helper methods

// Walk an object looking for children, returning undefined rather than an error
// Use: getNested('object', ['path', 'to', 'child'])
const getNested  = (nestedObj, pathArray) => {
    return pathArray.reduce((obj, key) =>
        (obj && obj[key] !== 'undefined') ? obj[key] : undefined, nestedObj);
}

// Normalize a single jsonapi item
const jsonapiToNormItem = (data) => {
  // Fastest way to deep copy
  const copy = JSON.parse(JSON.stringify(data))
  // Move attributes to top-level, nest original jsonapi under _jv
  const norm = Object.assign({'_jv': copy}, copy['attributes'])
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
  const jsonapi = {}
  jsonapi['attributes'] = JSON.parse(JSON.stringify(data))
  delete jsonapi['attributes']['_jv']
  jsonapi['id'] = data['_jv']['id']
  jsonapi['type'] = data['_jv']['type']
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
      const {type, id} = item['_jv']
      if (!(type in store)) {
        store[type] = {}
      }
      store[type][id] = item
    }
  } else {
    const {type, id} = record['_jv']
    store = { [type]: { [id]: record } }
  }
  return store
}

// Export a single object with references to 'private' functions for the test suite
const _testing = {
  actions: actions,
  mutations: mutations,
  getters: getters,
  jsonapiToNorm: jsonapiToNorm,
  jsonapiToNormItem: jsonapiToNormItem,
  normToJsonapi: normToJsonapi,
  normToJsonapiItem:normToJsonapiItem,
  normToStore: normToStore,
}


// Export this module
export {
  jsonapiModule,
  _testing
}
