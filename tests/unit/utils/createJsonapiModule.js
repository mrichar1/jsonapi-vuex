import { jsonapiModule } from '../../../src/jsonapi-vuex'
import config from '../../../src/config'

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

export default function(api, options = {}) {
  if (!api) {
    throw new Error('No api passed to jsonapiModule creator')
  }

  return jsonapiModule(api, {
    ...conf,
    ...options,
  })
}
