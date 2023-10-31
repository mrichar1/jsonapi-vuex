/**
 * Vuex actions, used via `this.$store.dispatch`, e.g.:
 * `this.$store.dispatch('jv/get', <args>)`
 *
 * `args` can be either a string or an object representing the item(s) required,
 * or it can be an array of string/object and an optional axios config object.
 * @namespace actions
 * @memberof module:jsonapi-vuex.jsonapiModule
 * @param {axios} api - an axios api instance
 * @param {object} conf - a jsonapi-vuex config object
 */

import get from 'lodash/get'
import merge from 'lodash/merge'

import { utils } from './jsonapi-vuex'

const actions = (api, conf) => {
  // Short var name
  let jvtag = conf['jvtag']

  /**
   * Internal method to 'write' related items from the API.
   * This method is wrapped by `(delete|patch|post)Related` actions, and is not available directly as an action.
   *
   * @async
   * @memberof module:jsonapi-vuex.jsonapiModule.actions
   * @param {object} context - Vuex context object
   * @param {object} args - A restructured object, specifying relationship(s)  - e.g. `{ _jv: { type: "endpoint", id: "1", relationships: {...} } }`
   * @param {object} args - A restructured object, specifying relationship(s)  - e.g. `{ _jv: { type: "endpoint", id: "1", relationships: {...} } }`
   * @return {object} Restructured representation of the 'parent' item
   */
  const writeRelated = async (context, args, method) => {
    let [data, config] = utils.unpackArgs(args)
    let [type, id] = utils.getTypeId(data)
    if (!type || !id) {
      throw 'No type/id specified'
    }

    let rels
    if (typeof data === 'object' && utils.hasProperty(data[jvtag], 'relationships')) {
      rels = data[jvtag]['relationships']
    } else {
      throw 'No relationships specified'
    }

    // Iterate over all records in rels
    let relPromises = []
    let includes = []
    for (let [relName, relItems] of Object.entries(rels)) {
      includes.push(relName)
      if (utils.hasProperty(relItems, 'data')) {
        let path = `${type}/${id}/relationships/${relName}`
        const apiConf = {
          method: method,
          url: path,
          data: relItems,
        }
        merge(apiConf, config)
        relPromises.push(api(apiConf))
      }
    }
    // Wait for all individual API calls to complete
    await Promise.all(relPromises)
    // Get the updated object from the API
    let params = {}
    // Also include related objects
    if (conf.relatedIncludes) {
      params['include'] = includes.join()
    }
    return context.dispatch('get', [`${type}/${id}`, { params: params }])
  }

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
     * @return {object} Restructured representation of the requested item(s)
     */
    get: (context, args) => {
      const [data, config] = utils.unpackArgs(args)
      const path = utils.getURL(data)
      const apiConf = { method: 'get', url: path }
      // https://github.com/axios/axios/issues/362
      config['data'] = config['data'] || {}
      merge(apiConf, config)
      return api(apiConf).then((results) => {
        let resData = utils.jsonapiToNorm(results.data.data)
        let [type, id] = utils.getTypeId(data)
        if (!id && conf.clearOnUpdate) {
          let record = resData
          if (Object.keys(resData).length === 0 && type) {
            // No records - assume type == endpoint
            record = { _jv: { type: type } }
          }
          if (record) {
            context.commit('clearRecords', record)
          }
        } else {
          context.commit('addRecords', resData)
        }
        utils.processIncludedRecords(context, results)
        resData = utils.checkAndFollowRelationships(context.state, context.getters, resData)
        resData = utils.preserveJSON(resData, results.data)
        return resData
      })
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
     * @return {object} Restructured representation of the requested item(s)
     */
    getRelated: async (context, args) => {
      const [data, config] = utils.unpackArgs(args)
      let [type, id, relName] = utils.getTypeId(data)
      if (!type || !id) {
        throw 'No type/id specified'
      }

      let rels
      if (typeof data === 'object' && utils.hasProperty(data[jvtag], 'relationships')) {
        rels = data[jvtag]['relationships']
      } else {
        let record = await context.dispatch('get', args)

        rels = get(record, [jvtag, 'relationships'], {})
        if (relName && utils.hasProperty(rels, relName)) {
          // Only process requested relname
          rels = { [relName]: rels[relName] }
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
            const resLink = await api.get(`${type}/${id}/relationships/${relName}`, config)
            relItems = resLink.data
          } catch (error) {
            throw `No such relationship: ${relName}`
          }
        }
        // Use related link if provided
        if (utils.hasProperty(relItems, 'links')) {
          relData = relItems['links']['related']
          if (!(typeof relData === 'string')) {
            relData = relData['href']
          }
          relData = [relData]
          // Or extract relationships from 'data' (type/id)
          // empty to-one rels (null) are special-cased
        } else if (utils.hasProperty(relItems, 'data') && relItems['data'] !== null) {
          relData = relItems['data']
          if (!Array.isArray(relData)) {
            // Treat as if always an array
            relData = [relData]
          }
        }
        if (relData) {
          for (let entry of relData) {
            // Rewrite 'data' objects to normalised form
            if (!(typeof entry === 'string')) {
              entry = { [jvtag]: entry }
            }
            relNames.push(relName)
            relPromises.push(context.dispatch('get', [entry, config]))
          }
        } else {
          // Empty to-one rels should have a relName but no data
          relNames.push(relName)
          // prettier-ignore
          relPromises.push(new Promise((resolve) => { resolve({}) }))
        }
      }
      // 'Merge' all promise resolution/rejection
      return Promise.all(relPromises).then((results) => {
        let related = {}
        results.forEach((result, i) => {
          // Get the relName from the same array position as the result item
          let relName = relNames[i]
          let normItem = { [relName]: {} }
          if (utils.hasProperty(result, jvtag)) {
            normItem[relName][result[jvtag]['type']] = {
              [result[jvtag]['id']]: result,
            }
          }
          merge(related, normItem)
        })
        return related
      })
    },
    /**
     * DELETE an object's relationships via its `relationships URL`
     *
     * @async
     * @memberof module:jsonapi-vuex.jsonapiModule.actions
     * @param {object} context - Vuex context object
     * @param {object} args - A restructured object, specifying relationship(s)  - e.g. `{ _jv: { type: "endpoint", id: "1", relationships: {...} } }`
     * @return {object} Restructured representation of the 'parent' item
     */
    deleteRelated: (context, args) => {
      return writeRelated(context, args, 'delete')
    },
    /**
     * PATCH an object's relationships via its `relationships URL`
     *
     * @async
     * @memberof module:jsonapi-vuex.jsonapiModule.actions
     * @param {object} context - Vuex context object
     * @param {object} args - A restructured object, specifying relationship(s)  - e.g. `{ _jv: { type: "endpoint", id: "1", relationships: {...} } }`
     * @return {object} Restructured representation of the 'parent' item
     */
    patchRelated: async (context, args) => {
      return writeRelated(context, args, 'patch')
    },
    /**
     * POST to an object's relationships via its `relationships URL`
     *
     * @async
     * @memberof module:jsonapi-vuex.jsonapiModule.actions
     * @param {object} context - Vuex context object
     * @param {object} args - A restructured object, specifying relationship(s)  - e.g. `{ _jv: { type: "endpoint", id: "1", relationships: {...} } }`
     * @return {object} Restructured representation of the 'parent' item
     */
    postRelated: async (context, args) => {
      return writeRelated(context, args, 'post')
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
     * @return {object} Restructured representation of the posted item
     */
    post: (context, args) => {
      let [data, config] = utils.unpackArgs(args)
      const path = utils.getURL(data, true)
      const apiConf = {
        method: 'post',
        url: path,
        data: utils.normToJsonapi(data),
      }
      merge(apiConf, config)
      return api(apiConf).then((results) => {
        utils.processIncludedRecords(context, results)

        // If the server handed back data, store it (to get id)
        // spec says 201, but some servers (wrongly) return 200
        if (results.status === 200 || results.status === 201) {
          data = utils.jsonapiToNorm(results.data.data)
        }
        context.commit('addRecords', data)
        return utils.preserveJSON(context.getters.get(data), results.data)
      })
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
     * @return {object} Restructured representation of the patched item
     */
    patch: (context, args) => {
      let [data, config] = utils.unpackArgs(args)
      if (conf.cleanPatch) {
        data = utils.cleanPatch(data, context.state, conf.cleanPatchProps)
      }
      const path = utils.getURL(data)
      const apiConf = {
        method: 'patch',
        url: path,
        data: utils.normToJsonapi(data),
      }
      merge(apiConf, config)
      return api(apiConf).then((results) => {
        // If the server handed back data, store it
        if (results.status === 200 && utils.hasProperty(results.data, 'data')) {
          // Full response
          context.commit('deleteRecord', data)
          data = utils.jsonapiToNorm(results.data.data)
          context.commit('addRecords', data)
        } else {
          // 200 (meta-only), or 204 (no resource) response
          // Update the store record from the patch
          context.commit('mergeRecords', data)
        }

        // NOTE: We deliberately process included records after any `deleteRecord` mutations
        // to avoid deleting any included records that we just added.
        utils.processIncludedRecords(context, results)
        return utils.preserveJSON(context.getters.get(data), results.data)
      })
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
     * @return {object} Restructured representation of the deleted item
     */
    delete: (context, args) => {
      const [data, config] = utils.unpackArgs(args)
      const path = utils.getURL(data)
      const apiConf = { method: 'delete', url: path }
      merge(apiConf, config)
      return api(apiConf).then((results) => {
        utils.processIncludedRecords(context, results)

        context.commit('deleteRecord', data)
        if (results.data) {
          return utils.preserveJSON(utils.jsonapiToNorm(results.data.data), results.data)
        } else {
          return data
        }
      })
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
     * @return {object} Restructured representation of the posted item
     */
    search: (context, args) => {
      // Create a 'noop' context.commit to avoid store modifications
      const nocontext = {
        commit: () => {},
        dispatch: context.dispatch,
        getters: context.getters,
      }
      // Use a new actions 'instance' instead of 'dispatch' to allow context override
      return actions(api, conf).get(nocontext, args)
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

export default actions
