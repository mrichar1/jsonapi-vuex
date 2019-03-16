import { jsonapiModule } from "../../../src/jsonapi-vuex.js";

export default function(api, options = {}) {
  if (!api) {
    throw new Error("No api passed to jsonapiModule creator");
  }

  // Turn off following by default to simplify test data in most cases
  return jsonapiModule(api, {
    follow_relationships_data: false,
    preserve_json: false,
    action_status_clean_interval: 0,
    ...options
  });
}
