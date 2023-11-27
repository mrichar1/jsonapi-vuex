/**
 * @module jsonapi-vuex
 */
import { defineStore } from 'pinia'
import actions from './actions'
import jvConfig from './config'
import getters from './getters'
import { Utils, ActionStatus } from './lib'

/**
 * jsonapi-vuex pinia store
 * @namespace
 * @memberof module:jsonapi-vuex
 * @param {axios} api - an axios instance
 * @param {object} [conf={}] - jsonapi-vuex configuation
 * @param {string} [name='jv'] - the pinia store id
 * @return {object} A Pinia store object
 */
const createJsonapiStore = ((api, conf = {}, name = 'jv') => {
  let config = Object.assign({}, jvConfig, conf)
  // Instantiate helper classes with config prior to re-exporting
  let utils = new Utils(config)
  let status = new ActionStatus(config.maxStatusID)

  return {
    jsonapiStore: defineStore({
      id: name,
      state: () => { return { [config['jvtag']]: {} } },
      actions: actions(api, config, utils),
      getters: getters(config, utils),
    }),
    config: config,
    status: status,
    utils: utils
  }
})

// Export instance of Utils, and merged configs
export { createJsonapiStore }
