import Vue from 'vue'

const mutations = {
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
  update_record: () => {}
}

const actions = {
  // FIXME: fetch, create, update, delete
}

const getters = {
  // FIXME: get item/collection
}

// Store Module
const jsonapiModule = (api) => {
  return {
    namespaced: true,

    state: {
      records: {}
    },

    mutations: mutations,
    actions: actions,
    getters: getters
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
