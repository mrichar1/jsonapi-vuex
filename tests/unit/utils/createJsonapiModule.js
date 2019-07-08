import { jsonapiModule } from '../../../src/jsonapi-vuex.js'

export default function(api, options = {}) {
  if (!api) {
    throw new Error('No api passed to jsonapiModule creator')
  }

  // Turn off following by default to simplify test data in most cases
  return jsonapiModule(api, {
    followRelationshipsData: false,
    preserveJson: false,
    mergeRecords: false,
    patchClean: false,
    toJSON: false,
    ...options,
  })
}
