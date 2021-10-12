# jsonapi-vuex

[![Build Status](https://github.com/mrichar1/jsonapi-vuex/actions/workflows/main.yml/badge.svg)](https://github.com/mrichar1/jsonapi-vuex/actions) [![npm bundle size](https://img.shields.io/bundlephobia/minzip/jsonapi-vuex.svg)](https://bundlephobia.com/result?p=jsonapi-vuex) [![Language grade: JavaScript](https://img.shields.io/lgtm/grade/javascript/g/mrichar1/jsonapi-vuex.svg?logo=lgtm&logoWidth=18)](https://lgtm.com/projects/g/mrichar1/jsonapi-vuex/context:javascript)

A module to access [JSONAPI](https://jsonapi.org) data from an API, using a [Vuex](https://vuex.vuejs.org/) store, restructured to make life easier.

**NOTE:** `v5.x` and later supports *only* `Vue3`. For `Vue2` the last supported version is `v4.5.3`

## Documentation

Documentation, including JSDoc-generated API reference, is available at: [JSONAPI-Vuex Documentation](https://mrichar1.github.io/jsonapi-vuex/)

## Contents

- [Restructured Data](#restructured-data)
- [Getting Started](#getting-started)
- [Usage](#usage)
  - [Features](#features)
  - [Actions](#actions)
  - [Getters](#getters)
  - [Mutations](#mutations)
  - [Helper Functions](#helper-functions)
  - [Utility Functions](#utility-functions)
  - [Configuration](#configuration)
  - [Endpoints](#endpoints)
- [Development](#development)

## Restructured Data

### Attributes

JSONAPI is an extremely useful format for clearly interacting with an API - however it is less useful for the end developer, who is generally more interested in the data contained in a record than the structure surrounding it.

In this module we 'reverse' the JSONAPI data into a form where data attributes become top-level keys, and JSONAPI-specific data is moved down under another key: `_jv`.

For example, the JSONAPI record:

```json
{
  "id": "1",
  "type": "widget",
  "attributes": {
    "name": "sprocket",
    "color": "black"
  },
  "meta": {}
}
```

This would be accessed as `record.attributes.color`

This module would restructure this record to be:

```json
{
  "name": "sprocket",
  "color": "black",
  "_jv": {
    "id": "1",
    "type": "widget",
    "meta": {}
  }
}
```

This would now be accessed as `record.color`

In cases where there are multiple records being returned in an object, the id is used as the key (though this is ignored in the code, and the 'real' id is always read from `_jv`):

```json
{
  "1": {
    "name": "sprocket",
    "color": "black"
  },
  "2": {
    "name": "cog",
    "color": "red"
  }
}
```

These are accessed as `record.1.name` or `record.2.color`, or if a list is needed, via `Object.values(record)`.

The above structure is actually how records are maintained in the store, nested below the `endpoint`:

```json
{
  "widget": {
    "1": {...},
    "2": {...}
  },
  "doohickey": {
    "20": {...}
  }
}
```

### Relationships

Relationships in JSONAPI are structured as either a `data` key containing one or more resource identifier objects under the relationship name, (or `links` which point to the related object in the API). For `data` entries, these are added to the 'root' of the object, where the key is the relationship name, and the value is a javascript [`getter`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Functions/get) that calls the `get` vuex getter for that record. This allows related data to be handled as if it was an attribute. (The object is structured using the same 'id-as-key' system for multiple entries as for records as described above).

The value returned by the getter will therefore be the value of the related object (if in the store), or an empty object (if not). Updating the store will cause the retuern value to update automatically.

```json
{
  "id": "1",
  "type": "widget",
  "attributes": {
    "name": "sprocket"
  },
  "relationships": {
    "doohickeys": {
      "data": [
        {
          "type": "doohickey",
          "id": "20"
        }
      ]
    }
  }
}
```

This becomes:

```js
{
  "name": "sprocket",
  "doohickeys": {
    "20": » get('doohickey/20')  // getter call
    }
  }
  "_jv": {
    "id": "1",
    "type": "widget",
    "relationships": {...}
  }
}
```

The attributes of the related object can then be accessed as e.g.: `record.doohickeys.20.size`

## Getting Started

Having created a Vue project, simply add the module to your `store.js`, passing it an [axios](https://github.com/axios/axios)-like instance:

```js
import Vuex from 'vuex'
import axios from 'axios'
import { jsonapiModule } from 'jsonapi-vuex'

const api = axios.create({
  baseURL: 'https://api.example.com/1/api/',
  headers: {
    'Content-Type': 'application/vnd.api+json',
  },
})

export default Vuex.createStore({
  modules: {
    jv: jsonapiModule(api),
  },
})
```

## Usage

### Features

There are a number of features which are worth explaining in more detail. Many of these can be configured - see the [Configuration](#configuration) section.

- _Includes_ - If the JSONAPI record contains an `includes` section, the data in this will be added to the store alongisde the 'main' records. (If includes are not used, then you will need to use [`getRelated`](#getrelated) to fetch relationships).

- _Follow relationships_ - `Relationships` specified as `data` resources in the JSONAPI data will be added alongside the attributes in the restructured data 'root' as a `get` getter property. Querying this key will return the record from the store, if present. Additionally, helper methods will be added to `_jv` to make dealing with these easier (see [Helper functions](#helper-functions))

- _Recursive Relationships_ - `Relationships` can be recursive - e.g. `author => article => blog => author`. This can cause infinite recursion problems with anything walking the object (such as `JSON.stringify`). By default, recursion is detected and stopped when following relationships, with the recursive relationship replaced with a (restructured) resource identifier.

- _Preserve JSON_ - The original JSONAPI record(s) can optionally be preserved in `_jv` if needed - for example if you need access to `meta` or other sections. To avoid duplication, the `data` section (`attributes`, `relationships` etc) is removed.

- _Clean Patches_ - by default, data passed to the `patch` action is used as-is. If `cleanPatch` is enabled, then the patch object is compared to the record in the store (if it exists), and any attributes with identical values are removed. This means that the final `patch` will only contain new or modified attributes, which is safer and more efficient, as it avoids sending unnecessary or 'stale' data. Additionally, unwanted properties in `_jv` (links, meta, relationships) can be removed.

- _Merging_ - By default, data returned from the API overwrites records already in the store. However, this may lead to inconsistencies if using [Sparse fieldsets](https://jsonapi.org/format/#fetching-sparse-fieldsets) or otherwise obtaining only a subset of data from the API. If merging is enabled, then new data will be merged onto existing data. this does however mean that you are responsible for explicitly calling the `deleteRecord` mutation in cases where attributes ahve been removed in the API, as they will never be removed from the store, only added to.

- _Clear on update_ - If enabled, then each new set of records is considered to be definitive for that `type`, and any other records of that `type` in the store will be removed. This option is useful for cases where you expect the API response to contain the full set of records from the server, as it avoids the need for manual cache expiry. The code will first apply the new records to the store, and then for each `type` which has had new records added, remove old ones. This is designed to be more efficient in terms of updating computed properties and UI redraws than emptying then repopulating the store. (see [Configuration](#configuration))

- _Endpoints_ - by default this module assumes that object types and API endpoints (item and collection) all share the same name. however, some APIs use plurals or other variations on the endpoint names. You can override the endpoint name via the `axios` `url` config option or the `links.self` attribute (see [Endpoints](#endpoints))

- _JSONPath_ - the `get` getter takes a second (optional) argument which is a JSONPath. This is used to filter the results being returned from the store. (see [`get`](#get))

- _Searching_ - The API can be searched without any changes being propagated to the store. This is useful for AJAX-style queries. (see [`search`](#search))

- _Action Status Tracking_ - The state of any in-flight action can be checked to discover if it has completed yet (successfully or with an error). (See [Action Status](#action-status))

### Vuex Methods

The 3 categories of Vuex methods are used as follows:

- Actions - These are used to query and modify the API, returning the results. Actions are asynchronous.

- Getters - These are used to directly query the store without contacting the API. Getters are synchronous.

- Mutations - These are used to change the state of the store without contacting the API. (They are usually called by Actions, but can be used directly). Mutations are synchronous.

### Actions

[Actions API Reference](https://mrichar1.github.io/jsonapi-vuex/module-jsonapi-vuex.jsonapiModule.actions.html)

The usual way to use this module is to use `actions` wherever possible. All actions are asynchronous, and both query the API and update the store, then return data in a normalized form. Actions can be handled using the `then/catch` methods of promises, or using `async/await`.

#### 'Direct' Actions

There are 4 actions (with aliases): `get` (`fetch`), `post` (`create`), `patch` (`update`), and `delete` which correspond to RESTful methods.

Actions are dispatched via `this.$store.dispatch`. As this project is used as a module, the first parameter to `dispatch` is of the form `module/action`, e.g. `jv/get`. The second parameter to `dispatch` is passed on to the action.

Actions take 2 arguments:

The first argument is an object containing [restructured data](#restructured-data). Actions which take no `data` argument apart from the record (`get` and `delete`) can also accept a URL to fetch, relative to the value of `axios` `baseURL` (if set). The leading slash is optional. This means you don't need to create an 'empty' restructured data object to get or delete a record.

The second argument is an (optional) [`axios` config object](https://github.com/axios/axios#request-config). This is used to configure `axios`, most commonly used for adding like headers, URL parameters etc.

_Note_ - The way Vuex is designed, `dispatch` can only accept 2 parameters. If passing 2 arguments to the action (i.e adding axios config), the arguments must be passed in an array.

_Note_ - The return value of the `get` action differs in that it returns the results of the action, rather than querying the store for the requested item/collection. This is because the `get` may be a partial or filtered request, returning only a subset of the item/collection. This means that if you use these results, later updates to the stores will not be reflected. If you want to query the store, then use the `get` getter once the action has returned.

Some examples:

```js
// To get all items in a collection, using a string path:
this.$store.dispatch('jv/get', 'widget').then((data) => {
  console.log(data)
})

// axios request query params (JSONAPI options, auth tokens etc)
const params = {
  token: 'abcdef123456',
}

// Get a specific record from the 'widget' endpoint, passing parameters to axios:
this.$store.dispatch('jv/get', ['widget/1', { params: params }]).then((data) => {
  console.log(data)
})

// Restructured representation of a record
const newWidget = {
  name: 'sprocket',
  color: 'black',
  _jv: {
    type: 'widget',
  },
}

// Create a new widget in the API, using a restructured object, and passing parameters to axios:
this.$store.dispatch('jv/post', [newWidget, { params: params }]).then((data) => {
  console.log(data)
})

// Update a widget in the API
const widgetColor = {
  color: 'red',
  _jv: {
    type: 'widget',
    id: '1',
  },
}

this.$store.dispatch('jv/patch', [widgetColor, { params: params }])

// Fetch, then update a widget in the API
this.$store.dispatch('jv/get', ['widget/1', { params: params }]).then((widget1) => {
  widget1['color'] = 'red'
  this.$store.dispatch('jv/patch', [widget1, { params: params }])
})

// Delete a widget from the API
this.$store.dispatch('jv/delete', ['widget/1', { params: params }])
```

#### search

The `search` action is the same as the `get` action, except that it does not result in any updates to the store. This action exists for efficiency purposes - for example to do 'search-as-you-type' AJAX-style queries without continually updating the store with all the results.

```js
const widgetSearch = (text) => {
  const params = { 'filter[text_contains]': text }

  this.$store.dispatch('jv/search', 'widget', { params: params }).then((data) => {
    return data
  })
}
```

#### 'Relationship' Actions

There are also 4 'relationship' actions: `getRelated`, `postRelated`, `patchRelated` and `deleteRelated` which modify relationships via an object's relationship URL.

#### getRelated

_Note_ - in many cases you may prefer to use the jsonapi server-side `include` option to get data on relationships included in your original query. (See [Relationships](#relationships)).

Like the RESTful actions, this takes 2 arguments - the string or object to be acted on, and an axios config object. It returns a deeply nested restructured tree - `relationship -> type -> id -> data`.

_Note_ - [getRelated](#getrelated) only works on specific items, not collections.

By default this action will fetch the record specified from the API, then work out its relationships and also fetch those.

If the argument is a string, it can optionally take a 3rd argument, e.g. `type/id/relationship` to cause only the named relationship to be followed.

If the argument is an object, then if the object contains a `_jv/relationships` section, then only these relationships will are followed. If the relationships section contains keys (i.e relationship `names`) but no values (i.e. [resource linkage](https://jsonapi.org/format/#fetching-relationships)) then these will be fetched from the API.

```js
// Assuming the API holds the following data
jsonapi = {
  data: {
    type: 'widget',
    id: '1',
  },
  relationships: {
    widgets: {
      data: {
        type: 'widget',
        id: '2',
      },
    },
    doohickeys: {
      data: {
        type: 'doohickey',
        id: '10',
      },
    },
  },
}

// Get all of widget 1's related items (widgets and doohickeys)
this.$store.dispatch('jv/getRelated', 'widget/1').then((data) => {
  console.log(data)
})

// Get only the items in the 'widgets' relationship
this.$store.dispatch('jv/getRelated', 'widget/1/widgets').then((data) => {
  console.log(data)
})

// Equivalent, using object instead of string argument
const customRels = {
  _jv: {
    type: 'widget',
    id: '1',
    relationships: {
      widgets: {
        data: {
          type: 'widget',
          id: '2',
        },
      },
    },
  },
}

// Equivalent, but 'doohickeys' resource linkage will be fetched from the server
// i.e. { data: { type: 'doohickey', id: '10' }}
const customRelsNoData = {
  _jv: {
    type: 'widget',
    id: '1',
    relationships: {
      doohickeys: undefined,
    },
  },
}

this.$store.dispatch('jv/getRelated', customRels).then((data) => {
  console.log(data)
})
```

#### (delete|patch|post)Related

The other 3 methods are all for 'writing' to the relationships of an object. they use the `relationship URLs` of an object, rather than writing to the object itself.

* `post` - adds relationships to an item.
* `delete` - removes relationships from an item.
* `patch` - replace all relationships for an item.

All methods return the updated item from the API, and also update the store (by internally calling the `get` action).

These methods take a single argument - an object representing the item, with the `'_jv` section containing relationships that are to be acted on. For example:

```js
const rels = {
  _jv: {
    type: 'widget',
    id: '1',
    relationships: {
      widgets: {
        data: {
          type: 'widget',
          id: '2',
        },
      },
      doohickeys: {
        data: {
          type: 'doohickeys',
          id: '10',
        },
      },
    },
  },
}

// Adds 'widget/2' and 'doohickey/10' relationships to 'widgets' and 'doohickeys' on 'widget/1'
this.$store.dispatch('jv/postRelated', rels).then((data) => {
  console.log(data)
})

// Removes 'widget/2' and 'doohickey/10' relationships from 'widgets' and 'doohickeys' on 'widget/1'
this.$store.dispatch('jv/deleteRelated', rels).then((data) => {
  console.log(data)
})

// Replaces 'widgets' and 'doohickeys' relationships with just 'widget/1' and 'doohickey/10'
this.$store.dispatch('jv/patchRelated', rels).then((data) => {
  console.log(data)
})
```

#### Error Handling

Most errors are likely to be those raised by the API in response to the request. These will take the form of an [Axios Error Handling](https://github.com/axios/axios#handling-errors) object, containing an [JSONAPI Error object](https://jsonapi.org/format/#error-objects).

To handle errors with `jsonapi-vuex` using `then/catch` methods on the promise:

```
this.$store
  .dispatch('jv/get', '/widget/99')
  .then((res) => {
    // request is successful - normalised jsonapi
    console.log(res)
  })
  .catch((errs) => {
    if (errs.response) {
      // API error
      console.log('HTTP Error Code:', errs.response.status)
      // Work with each error from the JSONAPI 'errors' array
      for (let err of errs.response.data.errors) {
        console.log(err.detail)
      }
    } else {
      // Some other type of error
      console.log(errors.message)
    }
  })
```

Otherwise if you are using `async/await`:

```
try {
  let res = await this.$store.dispatch('jv/get', '/widget/99')
  console.log(res)
} catch(errs) {
  <... handle errors here ...>
}
```

#### Action Status

The status of actions can be monitored using the `status` wrapper function, imported from `jsonapi-vuex`.

`status` takes as an argument an `action` dispatch function (or any function which returns a promise). It then calls and tracks the state of that function.

It returns the promise created by the function, with an ID added (`_statusID`). This ID can be used to get the status of the function via the `status.status` object:

```
import { status } from 'jsonapi-vuex'

// Capture the returned promise
let myAction = status.run(() => this.$store.dispatch('jv/get', 'widget/1'))

// Make a reference to the ID and status value
let myID = myAction._statusID
let myStatus = status.status[myID]

console.log('myAction Status is now:', myStatus) // Pending

// Handle the promise
myAction
  .then((result) => {
    console.log('myAction Status is now:', myStatus) // Success
    console.log(result)
  })
  .catch((error) => {
    console.log('myAction Status is now:', myStatus) // Error
    console.log(error)
  })

```

The value for the ID in `status.status` will be set to one of:

- 0 - Action is Pending
- 1 - Action is Complete (Success)
- -1 - Action is Complete (Error)

These values can be easily overidden if you wish to use the value directly:

```
// Change the status values at the start
status.PENDING = 'Please wait...'
status.SUCCESS = 'Task completed successfully'
status.ERROR = 'There was an error'
```

You can now easily track status in your UI:

```
<!-- Displayed once action completes (success or error) -->
<span v-if="myStatus">{{ result }}</span>

<!-- Display only on error -->
<span v-if="myStatus === -1">Error!</span>

<!-- Display the status value directly -->
<span>{{ myStatus }}</span>
```

_Note_ - By default action IDs will always increment. If you have concerns about `status.status` growing too large, and wish to limit this, see `maxStatusID` in [Configuration](#configuration)

### Getters

[Getters API Reference](https://mrichar1.github.io/jsonapi-vuex/module-jsonapi-vuex.jsonapiModule.getters.html)

There are 2 getters available: `get` and `getRelated`.

#### get

Get returns information directly from the store for previously cached records. This is useful for performance reasons, or for use in computed properties.

Get returns an object with getters that point to the data in the store. This means that updates to the store will be dynamically reflected in the results object. However it also means that it is not possible to modify this object as getters aren't writeable.

If you wish to modify the results object (e.g. for patching) then you should use the [`utils.deepCopy`](#utility-functions) method on the object to make a copy that is safe to modify. This deep copies the object, while preserving the [Helper Functions](#helper-functions).

```js
computed: {
  ...mapGetters({
    // Map 'jv/get' as a computed property 'get'
    get: 'jv/get',
  }),
  // Create a computed property that calls the getter with normalized data
  getWidget: function() {
    return this.$store.getters['jv/get']({ _jv: { type: 'Widget' } })
  },
},
```

Like actions, `get` takes an object or string indicating the desired resources. This can be an empty string, type, or type and id, to return the whole store, a collection, or an item.

`get` takes an optional 2nd argument - a `jsonpath` string to filter the record(s) which are being retrieved. See the project page for [JSONPath Syntax](https://github.com/dchester/jsonpath#jsonpath-syntax)

```js
// Assuming the store is as follows:
store = {
  widget: {
    '1': {
      name: 'sprocket',
      color: 'black',
    },
    '2': {
      name: 'cog',
      color: 'red',
    },
  },
}

// Get all records (of any type) with id = 10 (useful if your API has globally unique UUIDs)
this.$store.getters['jv/get']('', '$.*.10')

// Get all widgets that are red:
this.$store.getters['jv/get']('widget', '$[?(@.color=="red")]')

// Note that filters can create impossible conditions
// The following will return empty, as widget 1 is not red
this.$store.getters['jv/get']('widget/1', '$[?(@.color=="red")]')
```

#### getRelated

getRelated returns the relations of the specified resource. The resource is specified by either a string, or by a normalized resource object (as in `jv/get`). The getter returns an object with each of the resource's relationships as a key. The resources inside the objects `relationships`JSON-API key are mapped to a `jv/get` getter. This means that the resources can be retrieved from the result of `getRelated` once they are loaded into the store (with the `getRelated` action). If the resources are not loaded into the store yet, only the keys of the related resources will be returned.

For example, to get all widgets related to the widget with id 1:

```js
this.$store.getters['jv/getRelated']('widget/1')['widgets']
```

## Mutations

[Mutations API Reference](https://mrichar1.github.io/jsonapi-vuex/module-jsonapi-vuex.jsonapiModule.mutations.html)

There are several mutations which can be used to directly modify the store.

**Note** - in most cases mutations are called from actions as a result of querying the API, and it is not necessary to call mutations directly.

Mutations take normalised data as an argument.

#### deleteRecord

Deletes a single record from the store.

```js
store.commit('jv/deleteRecord', { _jv: { type: 'widget', id: '1' } })
```

#### addRecords

Updates records in the store. Replaces or merges with existing records, depending on the value of the [mergeRecords](#configuration) configuration option.

`addRecords` takes a normalised data object as an argument.

```
// Update a single record in ths store
store.commit(
  'jv/addRecords',
  {
    name: 'sprocket',
    color: 'black',
    _jv: {
      id: '1',
      type: 'widget',
    }
  }
)

// Update multiple records
store.commit(
  'jv/addRecords',
  {
    10: {
      name: 'sprocket',
      color: 'black',
      _jv: {
        id: '10',
        type: 'widget',
      }
    },
    20: { ... }
  }
)
```

#### replaceRecords

As `addRecords`, but explicitly replaces existing records.

#### mergeRecords

As `addRecords`, but explicitly merges onto existing records.

#### clearRecords

Will remove all records from the store (of a given type) which aren't contained in a given response. Can be set as the default behaviour on updates - see [clearOnUpdate](#usage).

```js
// Remove all records of type 'widget' from the store
store.commit('jv/clearRecords', { _jv: { type: 'widget' } })
```

## Helper Functions

Distinguishing between the `attributes` and `relationships` in the 'root' is simplified by a number of 'helper' functions which are provided in the `_jv` (`jvtag`) object:

- `attrs` - a getter property which returns an object containing all attributes.

- `rels` - a getter property which returns an object containing all relationships.

- `isAttr` - a function which returns True/False for a given name.

- `isRel` - a function which returns True/False for a given name.

These are particularly useful in `Vue` templates. For example to iterate over an item, picking out just the attributes:

```
<li v-for="(val, key) in widget._jv.attrs">{{ key }} {{ val }}</li>

<!-- Or -->

<li v-for="(val, key) in widget" v-if="widget._jv.isAttr(key)">{{ key }} {{ val }}</li>
```

## Utility Functions

[Utility Functions API Reference](https://mrichar1.github.io/jsonapi-vuex/module-jsonapi-vuex.utils.html)

Some functions are potentially useful for data manipulation etc outside the normal code flow. These functions are exported as `utils`, i.e:

```
import { utils } from `jsonapi-vuex`
```

The current utility functions are:

### `addJvHelpers`

Adds the 'helper' functions/properties to `_jv` in a restructured object.

`addJvHelpers` takes a restructured object as its argument, and returns (and modifies in-place) the obejct to include the helper methods (see [Helper functions](#helper-functions))

### `cleanPatch`

If you wish to clean patches on a per-patch basis, then set the `cleanPatch` configuration option to false, and instead use this method on your patch record prior to passing it to the action.

`cleanPatch` takes 3 arguments - the patch data, the state to be compared to, and an array of `_jv` properties to be preserved (see `cleanPatchProps` config option).

### `deepCopy`

Makes a deep copy of a normalised object, and adds/updates the [Helper functions](#helper-functions). This is done because walking the object will normally cause the helper functions to be called, resulting in static (and out-of-date) results.

This function is designed for situations where you wish to modify the results of a `getter` call, which will throw an error if any of its data is modified.

_Note_ - Be aware that this copy will be a 'static' version of the original object - if the store is subsequently updated, the copied object will no longer reflect this.

### `getTypeId`

Returns an array containing the type, id and rels for a given restructured object (if defined).

### `getUrl`

Returns the `self.links` url, or constructs a path from the type and id.

`getUrl` takes 2 arguments, the restructured object, and optional `post` boolean (defaults to `false`). If `post` is true, then the constructed path will not contain an `id`.

### `jsonapiToNorm`

Convert a JSONAPI object to a restructured object.

### `normToJsonapi`

Convert a restructured object to a JSONAPI object.

### `normToStore`

Convert a restructured object to its `store` form.

## Configuration

[Configuration API Reference](https://mrichar1.github.io/jsonapi-vuex/module-jsonapi-vuex-Configuration.html)

A config object can be passed to `jsonapiModule` when instantiating. It will override the default options:

```js
const config = { jvtag: '_splat' }
jm = jsonapiModule(api, config)
```

### Config Options

For many of these options, more information is provided in the [Usage](#usage) section.

- `jvtag` - The tag in restructured objects to hold object metadata (defaults to `_jv`)
- `followRelationshipsData` - Whether to follow and expand relationships and store them alongside attributes in the item 'root' (defaults to `true`).
- `preserveJson` - Whether actions should return the API response json (minus `data`) in `_jv/json` (for access to `meta` etc) (defaults to `false`)
- `mergeRecords` - Whether new records should be merged onto existing records in the store, or just replace them (defaults to `false`).
- `clearOnUpdate` - Whether the store should clear old records and only keep new records when updating from a 'collection' get. Applies to the `type(s)` associated with the new records. (defaults to false).
- `cleanPatch` - If enabled, patch object is compared to the record in the store, and only unique or modified attributes are kept in the patch. (defaults to false).
- `cleanPatchProps` - If cleanPatch is enabled, an array of `_jv` properties that should be preserved - `links`, `meta`, and/or `relationships`. (defaults to `[]`).
- `recurseRelationships` - If `false`, replaces recursive relationships with a normalised resource identifier (i.e `{ _jv: { type: 'x', id: 'y' } }`). (defaults to `false`).
- `maxStatusID` - Sets the highest status ID that will be used in `status` before rolling round to 1 again. (defaults to `-1` - no limit).

## Endpoints

By default `jsonapi-vuex` assumes that object type and API endpoint are the same. For example, `type: person` would have endpoint URLs of `/person` and `/person/1` for collections and single items.

When performing request on an already known single item (like an update), `jsonapi-vuex` will use the `links.self` attribute of an item to determine the API endpoint, if it is present.

However many APIs vary how endpoints are named - for example plurals (e.g. `type:person`, `/person/1` and `/people`), or cases where the endpoint doesn't match the type (e.g. `type: person` `/author` and `/author/1`) or even a combination (e.g. `type: person` `/author/1` and `/authors`)

To solve this it is possible to override the endpoint for a request by explicitly setting the `axios` `url` configuration option:

```
data = { _jv: { type: 'person' } }

// Default behaviour - will always treat type = itemEP = collectionEP
this.$store.dispatch('jv/get', data)
// GETs /person

// Explicitly override the endpoint url
this.$store.dispatch('jv/get', [data, { url: '/people' }])

this.$store.dispatch('jv/get', [data, { url: '/author/1' }])

// Override using a dynamic function
const customUrl = (data) => {
  if (data.hasOwnProperty('id')) {
    // single item (singular)
    return `person/${data.id}`
  } else {
    // collection (plural)
    return '/people'
  }
}

this.$store.dispatch('jv/get', [{ _jv: { type: 'widget' } }, { url: customUrl(data) }])

```

_Note_ - If provided the `url` option is used as-is - you are responsible for setting a valid collection or item url (with `id`) as appropriate.

## Development

Any bugs, enhancements or questions welcome as Issues (or even PRs!)

Development is currently being done with [yarn](https://yarnpkg.com/en/) - NPM should work, but if you hit unexpected issues, please try yarn before filing a bug.

### Setup

Having cloned this repository, simply run:

`yarn`

This should pull in all dependencies and development dependencies.

### Testing

There are several scripts set up in `package.json`:

`yarn unit` - Run the unit tests (uses `karma`, `mocha`, `chai`, `sinon`)

`yarn e2e` - Run the e2e tests (uses `nightwatch`)

`yarn testapp` - Runs the example `testapp` used in `e2e` testing to allow interactive testing/debugging in a browser.

`yarn fakeapiserver` - Runs a fake JSONAPI server used by the `testapp` for interactive testing/debugging.

`yarn test` - Runs both `unit` and `e2e` tests. (Used by `travis`).

_Note_ - All code is pre-processed with `babel` and `eslint` when testing for backwards compatability and linting.

### Coding Standards

Please follow these guidelines when writing and submitting code:

- **eslint** - This is run over both the main code and the test suite during tests. See `.eslint.rc.js` for changes to the default rules.

- **>= ES6** - Please try to use ES6 and newer methods (matching the policy that `Vue` has).

- **Tests** - This project aspires to test-driven development. Please submit unit tests (and ideally e2e tests) with all PRs (unless there's a good reason not to).

- **Versioning** - Semantic versioning should be used, see https://semver.org for details.

- **Continuous Integration** - The project uses [travis](https://travis-ci.com) to run tests against all submissions - PRs that are not passing will not be accepted (without good reason).

- **Specific Commits** - Please make all commits/PRs as atomic and specific as possible.
