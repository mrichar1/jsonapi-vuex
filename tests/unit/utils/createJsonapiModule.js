import { jsonapiModule, _testing } from '../../../src/jsonapi-vuex.js'

// Turn off the following to simplify test data in most cases
const customConfig = {
  followRelationshipsData: false,
  preserveJson: false,
  mergeRecords: false,
  patchClean: false,
  toJSON: false,
}
// Get a copy of the default config as tests may modify it.
const config = Object.assign({}, _testing.jvConfig, customConfig)

export default function(api, options = {}) {
  if (!api) {
    throw new Error('No api passed to jsonapiModule creator')
  }

  return jsonapiModule(api, {
    ...config,
    ...options,
  })
}
