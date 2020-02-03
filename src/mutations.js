/**
 * Vuex mutations, used via `this.$store.commit()`
 *
 * @namespace mutations
 * @memberof module:jsonapi-vuex.jsonapiModule
 */

import Vue from 'vue'
import get from 'lodash.get'
import { utils } from './jsonapi-vuex'

export default () => {
  return {
    /**
     * Delete a record from the store.
     * @memberof module:jsonapi-vuex.jsonapiModule.mutations
     * @param {object} state - The Vuex state object
     * @param {(string|object)} record - The record to be deleted
     */
    deleteRecord: (state, record) => {
      const [type, id] = utils.getTypeId(record)
      if (!type || !id) {
        throw `deleteRecord: Missing type or id: ${record}`
      }
      Vue.delete(state[type], id)
    },
    /**
     * Add record(s) to the store, according to `mergeRecords` config option
     * @memberof module:jsonapi-vuex.jsonapiModule.mutations
     * @param {object} state - The Vuex state object
     * @param {object} records - The record(s) to be added
     */
    addRecords: (state, records) => {
      utils.updateRecords(state, records)
    },
    /**
     * Replace (or add) record(s) to the store
     * @memberof module:jsonapi-vuex.jsonapiModule.mutations
     * @param {object} state - The Vuex state object
     * @param {object} records - The record(s) to be replaced
     */
    replaceRecords: (state, records) => {
      utils.updateRecords(state, records, false)
    },
    /**
     * Merge (or add) records to the store
     * @memberof module:jsonapi-vuex.jsonapiModule.mutations
     * @param {object} state - The Vuex state object
     * @param {object} records - The record(s) to be merged
     */
    mergeRecords: (state, records) => {
      utils.updateRecords(state, records, true)
    },
    /**
     * Delete all records from the store for a given type
     * @memberof module:jsonapi-vuex.jsonapiModule.mutations
     * @param {object} state - The Vuex state object
     * @param {object} records - A record with type set.
     */
    clearRecords: (state, records) => {
      const newRecords = utils.normToStore(records)
      for (let [type, item] of Object.entries(newRecords)) {
        const storeRecords = get(state, [type], {})
        for (let id of Object.keys(storeRecords)) {
          if (!utils.hasProperty(item, id)) {
            Vue.delete(state[type], id)
          }
        }
      }
    },
  }
}
