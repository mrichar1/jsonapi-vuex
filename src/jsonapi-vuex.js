import Vue from 'vue'
import merge from 'deepmerge';


const mutations = (api) => {
  return {
    // Add record(s) to the store
    add_record: (state, newRecords) => {
      const { records } = state
      const normRecords = normalize(newRecords)
      for (let [type, item] of Object.entries(normRecords)) {
        for (let [id, data] of Object.entries(item)) {
          Vue.set(records, type, {id: data})
        }
      }
    },
    delete_record: (state, record) => {
      const { type, id } = record
      delete state.records[type][id];
    },
    update_record: (state, record) => {
      const { records } = state
      const {type, id } = record
      const oldRecord = state.records[type][id]
      Vue.set(records[type], id, merge(oldRecord, normalize(record)[type][id]))
    }
  }
}

const actions = (api) => {
  return {
    get: ({ commit }, options) => {
      let path = options['type']
      if ("id" in options) {
        path += "/" + options['id']
      }
      return api.get(path)
        .then(results => {
          commit('add_record', results.data.data)
        })
    },
    post: ({ commit }, options) => {
      let path = options['type']
      if ("id" in options) {
        path += "/" + options['id']
      }
      return api.post(path, options)
        .then(results => {
          commit('add_record', options)
        })
    },
    patch: ({ commit }, options) => {
      let path = options['type']
      if ("id" in options) {
        path += "/" + options['id']
      }
      return api.patch(path, options)
        .then(results => {
          commit('update_record', options)
        })
    },
    delete: ({ commit }, options) => {
      let path = options['type']
      if ("id" in options) {
        path += "/" + options['id']
      }
      return api.delete(path)
        .then(results => {
          commit('update_record', options)
        })
    },
    get fetch () { return this.get },
    get create () { return this.post },
    get update () { return this.patch },
  }
}

const getters = (api) => {
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

// Normalize a single jsonapi item
const normalizeItem = (data) => {
  // Fastest way to deep copy
  const copy = JSON.parse(JSON.stringify(data))
  const { id, type } = copy
  delete copy['id']
  delete copy['type']
  return {[type]: {[id]: copy}}
}

// Normalize one or more jsonapi items
const normalize = (data) => {
  const norm = {}
  if (Array.isArray(data)) {
    data.forEach(item => {
      let { type } = item
      if (!(type in norm)) {
        norm[type] = {}
      }
      Object.assign(norm[type], normalizeItem(item)[type])
    })
  } else {
    Object.assign(norm, normalizeItem(data))
  }
  return norm
}

// Denormalize one or more records back to jsonapi
const denormalize = (data) => {
  const denorm = []
  Object.entries(data).forEach(([type, item]) => {
    Object.entries(item).forEach(([id, entries]) => {
      denorm.push({
        'id': id,
        'type': type,
        ...entries
      })

    })

  })
  if (denorm.length === 1) {
    return denorm[0]
  } else {
    return denorm
  }
}

// Export a single object with references to 'private' functions for the test suite
const _testing = {
  actions: actions,
  mutations: mutations,
  getters: getters,
  normalize: normalize,
  normalizeItem: normalizeItem,
  denormalize: denormalize,
  Vue: Vue,
}


// Export this module
export {
  jsonapiModule,
  _testing
}
