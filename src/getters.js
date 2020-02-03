/**
 * Vuex getters, used via `this.$store.getters`, e.g.:
 * `this.$store.getters['jv/get'](<args>)`
 *
 * @namespace getters
 * @memberof module:jsonapi-vuex.jsonapiModule
 * @param {object} conf - a jsonapi-vuex config object
 */

import get from 'lodash.get'
import { JSONPath } from 'jsonpath-plus'

import { utils } from './jsonapi-vuex'

export default (conf) => {
  // Short var name
  let jvtag = conf['jvtag']
  return {
    /**
     * Get record(s) from the store
     *
     * @memberof module:jsonapi-vuex.jsonapiModule.getters
     * @param {(string|object)} data
     * @param {string}  - A URL path to an item - e.g. `endpoint/1`
     * @param {object}  - A restructured object  - e.g. `{ _jv: { type: "endpoint", id: "1" } }`
     * @param {string} jsonpath - a JSONPath string to filter the record(s) which are being retrieved. See [JSONPath Syntax](https://github.com/dchester/jsonpath#jsonpath-syntax)
     * @return {object} Restructured representation of the record(s)
     */
    get: (state, getters) => (data, jsonpath, seen) => {
      let result
      if (!data) {
        // No data arg - return whole state object
        result = state
      } else {
        const [type, id] = utils.getTypeId(data)

        if (utils.hasProperty(state, type)) {
          if (id) {
            if (utils.hasProperty(state[type], id)) {
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
          result = utils.checkAndFollowRelationships(state, getters, result, seen)
        } else {
          // no records for that type in state
          return {}
        }
      }

      // Filter by jsonpath
      if (jsonpath) {
        const filtered = JSONPath({ path: jsonpath, json: result })
        if (Array.isArray(filtered)) {
          result = {}
          for (let item of filtered) {
            result[item[jvtag]['id']] = item
          }
        }
      }
      return result
    },
    /**
     * Get the related record(s) of a record from the store
     *
     * @memberof module:jsonapi-vuex.jsonapiModule.getters
     * @param {(string|object)} data
     * @param {string}  - A URL path to an item - e.g. `endpoint/1`
     * @param {object}  - A restructured object  - e.g. `{ _jv: { type: "endpoint", id: "1" } }`
     * @return {object} Restructured representation of the record(s)
     */
    getRelated: (state, getters) => (data, seen) => {
      const [type, id] = utils.getTypeId(data)
      if (!type || !id) {
        throw 'No type/id specified'
      }
      let parent = get(state, [type, id])
      if (parent) {
        return utils.getRelationships(getters, parent, seen)
      }
      return {}
    },
  }
}
