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
      delete state[type][id]
    },
    add_records: (state, records) => {
      const store_records = normToStore(records)
      for (let [type, item] of Object.entries(store_records)) {
        for (let [id, data] of Object.entries(item)) {
          if (!(type in state)) {
            Vue.set(state, type, {})
          }
          Vue.set(state[type], id, data)
        }
      }
    },
    update_record: (state, new_record) => {
      const { type, id } = new_record['_jv']
      const store_record = normToStore(new_record)
      const old_record = getNested(state, [type, id])
      Vue.set(state[type], id, merge(old_record, store_record[type][id]))
    }
  }
}

const actions = (api) => {
  return {
    get: (context, data) => {
      let params = {}
      if (Array.isArray(data)) {
        [ data, params ] = data
      }
      let path
      if (typeof data === 'string') {
        path = data
      } else {
        const { type, id } = data['_jv']
        path = type + "/" + id
      }
      return api.get(path, {params: params})
        .then((results) => {
          const res_data = jsonapiToNorm(results.data.data)
          context.commit('add_records', res_data)
          return context.getters.get(res_data)
        })
        .catch((error) => {
          return error
        })
    },
    post: (context, data) => {
      let params = {}
      if (Array.isArray(data)) {
        [ data, params ] = data
      }
      const { type } = data['_jv']
      return api.post(type, normToJsonapi(data), {params: params})
        .then(() => {
          context.commit('add_records', data)
          return context.getters.get(data)
        })
        .catch((error) => {
          return error
        })
    },
    patch: (context, data) => {
      let params = {}
      if (Array.isArray(data)) {
        [ data, params ] = data
      }
      const { type, id } = data['_jv']
      let path = type + "/" + id
      return api.patch(path, normToJsonapi(data), {params:params})
        .then(() => {
          context.commit('update_record', data)
          return context.getters.get(data)
        })
        .catch((error) => {
          return error
        })
    },
    delete: (context, data) => {
      let params = {}
      if (Array.isArray(data)) {
        [ data, params ] = data
      }
      let path
      if (typeof data === 'string') {
        // Use string as a verbatim path for api request
        path = data
      } else {
        const { type, id } = data['_jv']
        path = type + "/" + id
      }
      return api.delete(path, {params:params})
        .then(() => {
          context.commit('delete_record', data)
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
    get: (state) => (data) => {
      let type, id
      if (data) {
        if (typeof(data) === 'string') {
          [type, id] = data.replace(/^\//, "").split("/")
        } else {
          ({ type, id } = data['_jv'])
        }
      }
      if (type) {
        if (type in state) {
          if (id && id in state[type]) {
            return state[type][id]
          }
          // If there's only a single item, no nested id key needed
          const keys = Object.keys(state[type])
          if (keys.length === 1) {
            return state[type][keys[0]]
          }
          // Otherwise return the whole endpoint, keyed by id
          return state[type]
        }
      } else {
        return state
      }
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
  jsonapi['type'] = data['_jv']['type']
  if ('id' in data['_jv']) {
    jsonapi['id'] = data['_jv']['id']
  }
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
