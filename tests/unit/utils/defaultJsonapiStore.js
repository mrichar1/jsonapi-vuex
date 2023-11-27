import { createJsonapiStore } from '../../../src/jsonapi-vuex.js'
import config from '../../../src/config.js'

// Turn off the following to simplify test data in most cases
const customConfig = {
  followRelationshipsData: false,
  preserveJson: false,
  mergeRecords: false,
  patchClean: false,
  toJSON: false,
}
// Get a copy of the default config as tests may modify it.
const conf = Object.assign({}, config, customConfig)

export default function (api, options = {}, name = 'jv') {
  if (!api) {
    throw new Error('No api passed to jsonapiStore creator')
  }
  let testConf = Object.assign({}, conf, options)
  return createJsonapiStore(api, testConf, name)
}
