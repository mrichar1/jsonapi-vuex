/**
 * The default configuration is provided here. This is overridden by passing
 * a 'conf' object to {@link module:jsonapi-vuex.jsonapiModule}
 *
 * @namespace Configuration
 * @property {string} jvtag='_jv' - key to store jsonapi-vuex-related data in when destructuring (default: '_jv')
 * @property {boolean} followRelationshipsData=true - Follow relationships 'data' entries (from store)
 * @property {boolean} preserveJSON=false - Preserve API response json in return data
 * @property {boolean} mergeRecords=false - Merge or overwrite store records
 * @property {boolean} clearOnUpdate=false - Delete old records not contained in an update (on a per-type basis).
 * @property {boolean} cleanPatch=false - Always run 'cleanPatch' method when patching
 * @property {string[]} cleanPatchProps='[]' - If cleanPatch is enabled, which _jv props (links, meta, rels) should be kept?
 * @property {boolean} recurseRelationships=false - Allow relationships to be recursive?
 * @property {integer} maxStatusID=-1 - The maximum number of status IDs to generate before looping. Default is unlimited.
 */

export default {
  jvtag: '_jv',
  followRelationshipsData: true,
  preserveJson: false,
  mergeRecords: false,
  clearOnUpdate: false,
  cleanPatch: false,
  cleanPatchProps: [],
  recurseRelationships: false,
  maxStatusID: -1,
}
