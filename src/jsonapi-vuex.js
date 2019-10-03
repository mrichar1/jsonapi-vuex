/**
 * @module jsonapi-vuex
 */
import Vue from 'vue'
import get from 'lodash.get'
import isEqual from 'lodash.isequal'
import merge from 'lodash.merge'
// https://github.com/dchester/jsonpath/issues/89
import jp from 'jsonpath/jsonpath.min'

/**
 * Custom exception for returning record errors
 * @memberof module:jsonapi-vuex._internal
 */
class RecordError extends Error {
  constructor(message, value) {
    super(message)
    this.value = value
  }
}

const STATUS_LOAD = 'LOADING'
const STATUS_SUCCESS = 'SUCCESS'
const STATUS_ERROR = 'ERROR'

/**
 * @namespace
 * @property {string} jvtag='_jv' - key to store jsonapi-vuex-related data in when destructuring (default: '_jv')
 * @property {boolean} followRelationshipsData=true - Follow relationships 'data' entries (from store)
 * @property {boolean} preserveJSON=false - Preserve API response json in return data
 * @property {integer} actionStatusCleanAge=600 - Age of action status records to clean (in seconds - 0 disables)
 * @property {boolean} mergeRecords=false - Merge or overwrite store records
 * @property {boolean} clearOnUpdate=false - Delete old records not contained in an update (on a per-type basis).
 * @property {boolean} cleanPatch=false - Always run 'cleanPatch' method when patching
 * @property {string[]} cleanPatchProps='[]' - If cleanPatch is enabled, which _jv props (links, meta, rels) should be kept?
 * @property {boolean} recurseRelationships=false - Allow relationships to be recursive?
 */
let jvConfig = {
  jvtag: '_jv',
  followRelationshipsData: true,
  preserveJson: false,
  actionStatusCleanAge: 600,
  mergeRecords: false,
  clearOnUpdate: false,
  cleanPatch: false,
  cleanPatchProps: [],
  recurseRelationships: false,
}

let jvtag

/**
 * Shorthand for the 'safe' `hasOwnProperty` as described here:
 * [eslint: no-prototype-builtins](https://eslint.org/docs/rules/no-prototype-builtins])
 * @memberof module:jsonapi-vuex._internal
 */
const hasProperty = (obj, prop) => {
  return Object.prototype.hasOwnProperty.call(obj, prop)
}

// Global sequence counter for unique action ids
let actionSequenceCounter = 0

/**
 * @namespace
 * @memberof module:jsonapi-vuex.jsonapiModule
 */
const mutations = () => {
  return {
    /**
     * Delete a record from the store.
     * @memberof module:jsonapi-vuex.jsonapiModule.mutations
     * @param {object} state - The Vuex state object
     * @param {(string|object)} record - The record to be deleted
     */
    deleteRecord: (state, record) => {
      const [type, id] = getTypeId(record)
      if (!type || !id) {
        throw new RecordError('deleteRecord: Missing type or id', record)
      }
      Vue.delete(state[type], id)
    },
    /**
     * Add record(s) to the store, according to `mergeRecords` config option
     * @memberof module:jsonapi-vuex.jsonapiModule.mutations
     * @param {object} state - The Vuex state object
     * @param {(string|object)} records - The record(s) to be added
     */
    addRecords: (state, records) => {
      updateRecords(state, records)
    },
    /**
     * Replace (or add) record(s) to the store
     * @memberof module:jsonapi-vuex.jsonapiModule.mutations
     * @param {object} state - The Vuex state object
     * @param {(string|object)} records - The record(s) to be replaced
     */
    replaceRecords: (state, records) => {
      updateRecords(state, records, false)
    },
    /**
     * Merge (or add) records to the store
     * @memberof module:jsonapi-vuex.jsonapiModule.mutations
     * @param {object} state - The Vuex state object
     * @param {(string|object)} recordw - The record(s) to be merged
     */
    mergeRecords: (state, records) => {
      updateRecords(state, records, true)
    },
    /**
     * Delete all records from the store of a given type
     * @memberof module:jsonapi-vuex.jsonapiModule.mutations
     * @param {object} state - The Vuex state object
     * @param {(string|object)} records - The type (or a record with type property set) to be cleared
     */
    clearRecords: (state, records) => {
      const newRecords = normToStore(records)
      for (let [type, item] of Object.entries(newRecords)) {
        const storeRecords = get(state, [type], {})
        for (let id of Object.keys(storeRecords)) {
          if (!hasProperty(item, id)) {
            Vue.delete(state[type], id)
          }
        }
      }
    },
    /**
     * Delete all records from the store of a given type
     * @memberof module:jsonapi-vuex.jsonapiModule.mutations
     * @param {object} state - The Vuex state object
     * @param {object} obj
     * @param {integer} obj.id - The action id to set
     * @param {constant} obj.status - The action status to set
     */
    setStatus: (state, { id, status }) => {
      Vue.set(state[jvtag], id, { status: status, time: Date.now() })
    },
    /**
     * Delete all records from the store of a given type
     * @memberof module:jsonapi-vuex.jsonapiModule.mutations
     * @param {object} state - The Vuex state object
     * @param {integer} id - The action id to delete
     */
    deleteStatus: (state, id) => {
      if (id in state[jvtag]) {
        Vue.delete(state[jvtag], id)
      }
    },
  }
}

/**
 * Vuex actions, used via `this.$store.dispatch`, e.g.:
 * `this.$store.dispatch("jv/get", <args>)`
 *
 * `args` can be either a string or an object representing the item(s) required,
 * or it can be an array of string/object and an optional axios config object.
 * @namespace
 * @memberof module:jsonapi-vuex.jsonapiModule
 * @param {axios} api - an axios api instance
 */
const actions = (api) => {
  return {
    /**
     * Get items from the API
     *
     * @async
     * @memberof module:jsonapi-vuex.jsonapiModule.actions
     * @param {object} context - Vuex context object
     * @param {(string|object|array)} args - See {@link module:jsonapi-vuex.jsonapiModule.actions} for a summary of args
     * @param {string}  - A URL path to an item - e.g. `endpoint/1`
     * @param {object}  - A restructured object  - e.g. `{ _jv: { type: "endpoint", id: "1" } }`
     * @param {array}  - A 2-element array, consisting of a string/object and an optional axios config object
     * @return {object} - Restructured representation of the requested item(s)
     */
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
          resData = checkAndFollowRelationships(
            context.state,
            context.getters,
            resData
          )
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
    /**
     * Get related items from the API
     *
     * @async
     * @memberof module:jsonapi-vuex.jsonapiModule.actions
     * @param {object} context - Vuex context object
     * @param {(string|object|array)} args - See {@link module:jsonapi-vuex.jsonapiModule.actions} for a summary of args
     * @param {string}  - A URL path to an item - e.g. `endpoint/1`
     * @param {object}  - A restructured object  - e.g. `{ _jv: { type: "endpoint", id: "1" } }`
     * @param {array}  - A 2-element array, consisting of a string/object and an optional axios config object
     * @return {object} - Restructured representation of the requested item(s)
     */
    getRelated: async (context, args) => {
      const data = unpackArgs(args)[0]
      let [type, id, relName] = getTypeId(data)
      if (!type || !id) {
        throw 'No type/id specified'
      }
      const actionId = actionSequence(context)
      context.commit('setStatus', { id: actionId, status: STATUS_LOAD })

      let rels
      if (
        typeof data === 'object' &&
        hasProperty(data[jvtag], 'relationships')
      ) {
        rels = data[jvtag]['relationships']
      } else {
        try {
          let record = await context.dispatch('get', args)

          rels = get(record, [jvtag, 'relationships'], {})
          if (relName && hasProperty(rels, relName)) {
            // Only process requested relname
            rels = { [relName]: rels[relName] }
          }
        } catch (error) {
          // Log and re-throw if 'get' action fails
          context.commit('setStatus', { id: actionId, status: STATUS_ERROR })
          throw error
        }
      }

      // We can't pass multiple/non-promise vars in a promise chain,
      // so must define such vars in a higher scope
      let relNames = []
      let relPromises = []

      // Iterate over all records in rels
      for (let [relName, relItems] of Object.entries(rels)) {
        let relData
        // relationships value might be empty if user-constructed
        // so fetch relationships resource linkage for these
        if (!relItems) {
          try {
            const resLink = await api.get(
              `${type}/${id}/relationships/${relName}`
            )
            relItems = resLink.data
          } catch (error) {
            throw `No such relationship: ${relName}`
          }
        }
        // Extract relationships from 'data' (type/id)
        // empty to-one rels (null) are special-cased
        if (hasProperty(relItems, 'data') && relItems['data'] !== null) {
          relData = relItems['data']
          if (!Array.isArray(relData)) {
            // Treat as if always an array
            relData = [relData]
          }
          // Or from 'links/related'
        } else if ('links' in relItems) {
          relData = relItems['links']['related']
          if (!(typeof relData === 'string')) {
            relData = relData['href']
          }
          relData = [relData]
        }
        if (relData) {
          for (let entry of relData) {
            // Rewrite 'data' objects to normalised form
            if (!(typeof entry === 'string')) {
              entry = { [jvtag]: entry }
            }
            relNames.push(relName)
            relPromises.push(context.dispatch('get', entry))
          }
        } else {
          // Empty to-one rels should have a relName but no data
          relNames.push(relName)
          // prettier-ignore
          relPromises.push(new Promise((resolve) => { resolve({}) }))
        }
      }
      // 'Merge' all promise resolution/rejection
      let action = Promise.all(relPromises)
        .then((results) => {
          let related = {}
          results.forEach((result, i) => {
            // Get the relName from the same array position as the result item
            let relName = relNames[i]
            let normItem = { [relName]: {} }
            if (hasProperty(result, jvtag)) {
              normItem[relName][result[jvtag]['type']] = {
                [result[jvtag]['id']]: result,
              }
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
    /**
     * Post an item to the API
     *
     * @async
     * @memberof module:jsonapi-vuex.jsonapiModule.actions
     * @param {object} context - Vuex context object
     * @param {(object|array)} args - See {@link module:jsonapi-vuex.jsonapiModule.actions} for a summary of args
     * @param {object}  - A restructured object  - e.g. `{ _jv: { type: "endpoint", id: "1" } }`
     * @param {array}  - A 2-element array, consisting of a string/object and an optional axios config object
     * @return {object} - Restructured representation of the posted item
     */
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
    /**
     * Patch an item in the API
     *
     * @async
     * @memberof module:jsonapi-vuex.jsonapiModule.actions
     * @param {object} context - Vuex context object
     * @param {(object|array)} args - See {@link module:jsonapi-vuex.jsonapiModule.actions} for a summary of args
     * @param {object}  - A restructured object  - e.g. `{ _jv: { type: "endpoint", id: "1" } }`
     * @param {array}  - A 2-element array, consisting of a string/object and an optional axios config object
     * @return {object} - Restructured representation of the patched item
     */
    patch: (context, args) => {
      let [data, config] = unpackArgs(args)
      if (jvConfig.cleanPatch) {
        data = cleanPatch(data, context.state, jvConfig.cleanPatchProps)
      }
      const path = getURL(data)
      const actionId = actionSequence(context)
      const apiConf = { method: 'patch', url: path, data: normToJsonapi(data) }
      merge(apiConf, config)
      context.commit('setStatus', { id: actionId, status: STATUS_LOAD })
      let action = api(apiConf)
        .then((results) => {
          // If the server handed back data, store it
          if (results.status === 200 && hasProperty(results.data, 'data')) {
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
    /**
     * Delete an item from the API
     *
     * @async
     * @memberof module:jsonapi-vuex.jsonapiModule.actions
     * @param {object} context - Vuex context object
     * @param {(string|object|array)} args - See {@link module:jsonapi-vuex.jsonapiModule.actions} for a summary of args
     * @param {string}  - A URL path to an item - e.g. `endpoint/1`
     * @param {object}  - A restructured object  - e.g. `{ _jv: { type: "endpoint", id: "1" } }`
     * @param {array}  - A 2-element array, consisting of a string/object and an optional axios config object
     * @return {object} - Restructured representation of the deleted item
     */
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
    /**
     * Get items from the API without updating the Vuex store
     *
     * @see module:jsonapi-vuex.jsonapiModule.actions.get
     * @async
     * @memberof module:jsonapi-vuex.jsonapiModule.actions
     * @param {object} context - Vuex context object
     * @param {(string|object|array)} args - See {@link module:jsonapi-vuex.jsonapiModule.actions} for a summary of args
     * @param {string}  - A URL path to an item - e.g. `endpoint/1`
     * @param {object}  - A restructured object  - e.g. `{ _jv: { type: "endpoint", id: "1" } }`
     * @param {array}  - A 2-element array, consisting of a string/object and an optional axios config object
     * @return {object} - Restructured representation of the posted item
     */
    search: (context, args) => {
      // Create a 'noop' context.commit to avoid store modifications
      const nocontext = {
        commit: () => {},
        dispatch: context.dispatch,
        getters: context.getters,
      }
      // Use a new actions 'instance' instead of 'dispatch' to allow context override
      return actions(api).get(nocontext, args)
    },
    /**
     * Alias for {@link module:jsonapi-vuex.jsonapiModule.actions.get}
     * @async
     * @memberof module:jsonapi-vuex.jsonapiModule.actions
     */
    get fetch() {
      return this.get
    },
    /**
     * Alias for {@link module:jsonapi-vuex.jsonapiModule.actions.post}
     * @async
     * @memberof module:jsonapi-vuex.jsonapiModule.actions
     */
    get create() {
      return this.post
    },
    /**
     * Alias for {@link module:jsonapi-vuex.jsonapiModule.actions.patch}
     * @async
     * @memberof module:jsonapi-vuex.jsonapiModule.actions
     */
    get update() {
      return this.patch
    },
  }
}

/**
 * @namespace
 * @memberof module:jsonapi-vuex.jsonapiModule
 */
const getters = () => {
  return {
    get: (state, getters) => (data, jsonpath, seen) => {
      let result
      if (!data) {
        // No data arg - return whole state object
        result = state
      } else {
        const [type, id] = getTypeId(data)

        if (type in state) {
          if (id) {
            if (hasProperty(state[type], id)) {
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
          result = checkAndFollowRelationships(state, getters, result, seen)
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
    getRelated: (state, getters) => (data, seen) => {
      const [type, id] = getTypeId(data)
      if (!type || !id) {
        throw 'No type/id specified'
      }
      let parent = get(state, [type, id])
      if (parent) {
        return getRelationships(getters, parent, seen)
      }
      return {}
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

/**
 * jsonapi-vuex store module
 * @namespace
 * @memberof module:jsonapi-vuex
 * @param {axios} api - an axios instance
 * @param {object} [conf={}] - jsonapi-vuex configuation
 * @return {object} - A Vuex store object
 */
const jsonapiModule = (api, conf = {}) => {
  Object.assign(jvConfig, conf)
  jvtag = jvConfig['jvtag']
  let state = { [jvtag]: {} }

  return {
    namespaced: true,

    state: state,

    mutations: mutations(),
    actions: actions(api),
    getters: getters(),
  }
}

// Helper functions
/**
 * Documentation for internal functions etc.
 * These are not available when the module is imported,
 * and are documented for module developers only.
 * @namespace _internal
 * @memberof module:jsonapi-vuex
 */

/**
 * @memberof utils
 * @param {object} obj - A 'simple' object to deep copy.
 */

const getRelationships = (getters, parent, seen = []) => {
  let relationships = get(parent, [jvtag, 'relationships'], {})
  let relationshipsData = {}
  for (let relName of Object.keys(relationships)) {
    let relations = get(relationships, [relName, 'data'])
    relationshipsData[relName] = {}
    if (relations) {
      let isItem = !Array.isArray(relations)
      let relationsData = {}

      for (let relation of isItem ? Array.of(relations) : relations) {
        let relType = relation['type']
        let relId = relation['id']

        if (!hasProperty(relationsData, relId)) {
          Object.defineProperty(relationsData, relId, {
            get() {
              let current = [relName, relType, relId]
              // Stop if seen contains an array which matches 'current'
              if (
                !jvConfig.recurseRelationships &&
                seen.some((a) => a.every((v, i) => v === current[i]))
              ) {
                return { [jvtag]: { type: relType, id: relId } }
              } else {
                // prettier-ignore
                return getters.get(
                    `${relType}/${relId}`,
                    undefined,
                    [...seen, [relName, relType, relId]]
                  )
              }
            },
            enumerable: true,
          })
        }
      }
      if (isItem) {
        Object.defineProperty(
          relationshipsData,
          relName,
          Object.getOwnPropertyDescriptor(
            relationsData,
            Object.keys(relationsData)[0]
          )
        )
      } else {
        Object.defineProperties(
          relationshipsData[relName],
          Object.getOwnPropertyDescriptors(relationsData)
        )
      }
    }
  }
  return relationshipsData
}

const deepCopy = (obj) => {
  // Deep copy a normalised object, then re-add helper nethods
  const copyObj = _copy(obj)
  if (Object.entries(copyObj).length) {
    return addJvHelpers(copyObj)
  }
  return obj
}

/**
 * @memberof module:jsonapi-vuex._internal
 * @param {object} data - An object to be deep copied
 * @return {object} - A deep copied object
 */
const _copy = (data) => {
  // Recursive object copying function (for 'simple' objects)
  let out = Array.isArray(data) ? [] : {}
  for (let key in data) {
    // null is typeof 'object'
    if (typeof data[key] === 'object' && data[key] !== null) {
      out[key] = _copy(data[key])
    } else {
      out[key] = data[key]
    }
  }
  return out
}

const cleanPatch = (patch, state = {}, jvProps = []) => {
  // Add helper properties (use a copy to prevent side-effects)
  const modPatch = deepCopy(patch)
  const attrs = get(modPatch, [jvtag, 'attrs'])
  const clean = { [jvtag]: {} }
  // Only try to clean the patch if it exists in the store
  const stateRecord = get(state, modPatch[jvtag]['id'])
  if (stateRecord) {
    for (let [k, v] of Object.entries(attrs)) {
      if (!hasProperty(stateRecord, k) || !isEqual(stateRecord[k], v)) {
        clean[k] = v
      }
    }
  } else {
    Object.assign(clean, attrs)
  }

  // Add _jv data, as required
  clean[jvtag]['type'] = patch[jvtag]['type']
  clean[jvtag]['id'] = patch[jvtag]['id']
  for (let prop of jvProps) {
    let propVal = get(patch, [jvtag, prop])
    if (propVal) {
      clean[jvtag][prop] = propVal
    }
  }

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
      return hasProperty(get(obj, [jvtag, 'relationships'], {}), name)
    },
    isAttr(name) {
      return name !== jvtag && hasProperty(obj, name) && !this.isRel(name)
    },
  })
  // Use defineProperty as assign copies the values, not the getter function
  // https://github.com/mrichar1/jsonapi-vuex/pull/40#issuecomment-474560508
  Object.defineProperty(obj[jvtag], 'rels', {
    get() {
      const rel = {}
      for (let key of Object.keys(get(obj, [jvtag, 'relationships'], {}))) {
        rel[key] = obj[key]
      }
      return rel
    },
    // Allow to be redefined
    configurable: true,
  })
  Object.defineProperty(obj[jvtag], 'attrs', {
    get() {
      const att = {}
      for (let [key, val] of Object.entries(obj)) {
        if (this.isAttr(key)) {
          att[key] = val
        }
      }
      return att
    },
    // Allow to be redefined
    configurable: true,
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

const checkAndFollowRelationships = (state, getters, records, seen) => {
  if (jvConfig.followRelationshipsData) {
    let resData = {}
    if (jvtag in records) {
      // single item
      resData = followRelationships(state, getters, records, seen)
    } else {
      // multiple items
      for (let [key, item] of Object.entries(records)) {
        resData[key] = followRelationships(state, getters, item, seen)
      }
    }
    if (resData) {
      return resData
    }
  }
  return records
}

// Follow relationships and expand them into _jv/rels
const followRelationships = (state, getters, record, seen) => {
  // Make a shallow copy of the object's keys (by reference - preserve getters).
  // We can't add rels to the original object, otherwise Vue's watchers
  // spot the potential loop and throw an error
  let data = {}

  Object.defineProperties(data, Object.getOwnPropertyDescriptors(record))

  let relationships = getRelationships(getters, data, seen)
  Object.defineProperties(data, Object.getOwnPropertyDescriptors(relationships))

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

  // Spec: The values of the id and type members MUST be strings.
  // uri encode to prevent mis-interpretation as url parts.
  // Strip any empty strings (falsey items)
  return [
    type && encodeURIComponent(type),
    id && encodeURIComponent(id),
    rel && encodeURIComponent(rel),
  ].filter(Boolean)
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
    if (hasProperty(data[jvtag], member)) {
      jsonapi[member] = data[jvtag][member]
    }
  }
  // User-generated data (e.g. post) has no helper functions
  if (hasProperty(data[jvtag], 'attrs')) {
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
  for (let item of get(results, ['data', 'included'], [])) {
    const includedItem = jsonapiToNormItem(item)
    context.commit('addRecords', includedItem)
  }
}

/**
 * A collection of utility functions
 * @namespace utils
 * @memberof module:jsonapi-vuex
 */
const utils = {
  addJvHelpers: addJvHelpers,
  cleanPatch: cleanPatch,
  deepCopy: deepCopy,
  getTypeId: getTypeId,
  getURL: getURL,
  jsonapiToNorm: jsonapiToNorm,
  normToJsonapi: normToJsonapi,
  normToStore: normToStore,
}

// Export a single object with references to 'private' functions for the test suite
/**
 * An object containing references to all internal functions for the test suite to import
 * @memberof module:jsonapi-vuex._internal
 */
const _testing = {
  _copy: _copy,
  actionSequence: actionSequence,
  getTypeId: getTypeId,
  deepCopy: deepCopy,
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
  getRelationships: getRelationships,
}

// Export this module
export { jsonapiModule, utils, _testing }
