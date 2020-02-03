/**
 * @module jsonapi-vuex
 */

import actions from './actions'
import jvConfig from './config'
import mutations from './mutations'
import getters from './getters'
import { Utils } from './lib'

let config, utils

/**
 * jsonapi-vuex store module
 * @namespace
 * @memberof module:jsonapi-vuex
 * @param {axios} api - an axios instance
 * @param {object} [conf={}] - jsonapi-vuex configuation
 * @return {object} A Vuex store object
 */
const jsonapiModule = (api, conf = {}) => {
  config = Object.assign({}, jvConfig, conf)
  let state = { [config['jvtag']]: {} }

  utils = new Utils(config, getters, state)

  return {
    namespaced: true,

    state: state,

    actions: actions(api, config),
    getters: getters(config),
    mutations: mutations(),
  }
}

// Export instance of Utils, and merged configs
export { jsonapiModule, utils, config }
