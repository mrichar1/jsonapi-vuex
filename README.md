# jsonapi-vuex

[![Build Status](https://travis-ci.com/mrichar1/jsonapi-vuex.svg?branch=master)](https://travis-ci.com/mrichar1/jsonapi-vuex) [![npm bundle size](https://img.shields.io/bundlephobia/min/jsonapi-vuex.svg)](https://bundlephobia.com/result?p=jsonapi-vuex) [![Language grade: JavaScript](https://img.shields.io/lgtm/grade/javascript/g/mrichar1/jsonapi-vuex.svg?logo=lgtm&logoWidth=18)](https://lgtm.com/projects/g/mrichar1/jsonapi-vuex/context:javascript)

A module to access JSONAPI data from an API, using a Vuex store, restructured to make life easier.

## Features

- Creates a [Vuex](https://vuex.vuejs.org/) module to store API data.
- High-level methods to wrap common RESTful operations (GET, POST, PUT, DELETE). (See [Actions](#actions))
- Restructures/normalizes data, making record handling easier. (See [Restructured Data](#restructured-data))
- Makes fetching related objects easy. (See [getRelated](#getrelated))
- Relationships can be followed and expanded into records automatically (recursively). (See [Related Items](#related-items))
- Uses [Axios](https://github.com/axios/axios) (or your own axios-like module) as the HTTP client.
- Uses [jsonpath](https://github.com/dchester/jsonpath) for filtering when getting objects from the store.
- Records the status of actions (LOADING, SUCCESS, ERROR).

## Setup

Having created a Vue project, simply add the module to your store.js, passing it an axios-like instance:

```js
import Vue from 'vue'
import Vuex from 'vuex'
import axios from 'axios'
import { jsonapiModule } from 'jsonapi-vuex'

Vue.use(Vuex)

const api = axios.create({
  baseURL: 'https://api.example.com/1/api/',
  headers: {
    'Content-Type': 'application/vnd.api+json',
  },
})

export default new Vuex.Store({
  modules: {
    jv: jsonapiModule(api),
  },
})
```

## Usage

The most common way to access the API and update the store is through high-level `actions` - though `getters` (and `mutations`) can be used directly if required.

### Actions

The usual way to use this module is to use `actions` wherever possible. All actions are asynchronous, and both query the API and update the store, then return data in a normalized form. Every action call's state is tracked as it progresses, and this status can be easily queried (see the `status` getter).

There are 4 actions (with aliases): `get` (`fetch`), `post` (`create`), `patch` (`update`), and `delete` which correspond to RESTful methods. There is also a [getRelated](#getrelated) action which fetches a record's [related items](#related-items).

#### RESTful actions

These actions take 2 arguments: the path/object to be acted on, and an (optional) [`axios` config object](https://github.com/axios/axios#request-config). The first argument is an object containing [restructured data](#restructured-data).

_Note_ - Since the `dispatch` method can only accept a single argument, if both arguments are used, the argument must be an array.

The first argument is an object containing [restructured data](#restructured-data). Actions which take no `data` argument apart from the record (`get` and `delete`) can also accept a URL to fetch (relative to `axios` `baseURL` (if set) leading slash is optional). This means you don't need to create an 'empty' restructured data object to get or delete a record. Some examples:

```js
// Restructured representation of a record
const newWidget = {
  name: 'sprocket',
  color: 'black',
  _jv: {
    type: 'widget',
    id: '1',
  },
}

// Request Query params (JSONAPI options, auth tokens etc)
const params = {
  token: 'abcdef123456',
}

// To get all items in a collection, using a sring path:
this.$store.dispatch('jv/get', 'widget').then((data) => {
  console.log(data)
})

// Get a specific record from the 'widget' endpoint, passing parameters to axios:
this.$store
  .dispatch('jv/get', ['widget/1', { params: params }])
  .then((data) => {
    console.log(data)
  })

// Create a new widget in the API, using a restructured object, and passing parameters to axios:
this.$store
  .dispatch('jv/post', [newWidget, { params: params }])
  .then((data) => {
    console.log(data)
  })

// Override the API resource type (useful for using pluralized types)
this.$store
  .dispatch('jv/post', [
    newWidget,
    {
      params: params,
      jvConfig: {
        resourceType: 'widgets',
      },
    },
  ])
  .then((data) => {
    console.log(data)
  })
```

#### getRelated

_Note_ - in many cases you may prefer to use the jsonapi server-side `include` option to get data on relationships included in your original query. (See [Related Items](#related-items)).

Like the RESTful actions, this takes 2 arguments - the URL/object to be acted on, and an axios config object. It returns a deeply nested restructured tree - `relationship -> type -> id -> data`.

_Note_ - [getRelated](#getrelated) only works on specific items, not collections.

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
```

### Getters

There are 2 getters available. `get` and `status`.

#### get

Get returns information directly from the store for previously cached records. This is useful for performance reasons, or for use in computed properties.

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
this.$store.getters['jv/get']('widget', '[?(@.color=="red")]')

// Note that filters can create impossible conditions
// The following will return empty, as widget 1 is not red
this.$store.getters['jv/get']('widget/1', '[?(@.color=="red")]')
```

#### status

Every action is given a unique id, and this is both returned as a property of the promise, and preserved in `state` under the `jvtag` (as defined in config).

The `status` getter accepts either an id, or a promise returned by an action, and returns the stored state of the action. This can be one of:

- LOADING
- SUCCESS
- ERROR

For example, to determine the state of an action:

```js
// Get a promise from calling an action
let action = this.$store.dispatch('jv/get', 'widget')

// Check the status of the action (and assuming it hasn't yet completed)
let status = this.$store.getters['jv/status'](action)

console.log(status) // LOADING

// Continue to handle the action results in the usual way
action.then((data) => {
  // The action has returned
  console.log(status) // SUCCESS

  // Continue as usual
  console.log(data)
})
```

The `status` getter is primarily designed to use useful for handling UI changes based on actions.

For example, you might want to disable an attribute while an action is happening by 'watching' `status`:

```
<input type="text" :disabled="status === 'LOADING'">
```

### Related Items

By default the `get` action and getter are both configured to follow and expand out relationships recursively, if they are provided as `data` entries (i.e. `{type: 'widget', id: '1'}`). This behaviour is controlled with the `followRelationshipsData` config option.

_Note_ - If using the `action` you may wish to also set the `include` parameter on the server query to include the relationships you are interested in. Any records returned in the `included` section of the jsonapi data will be automatically added to the store.

For any relationships where the related item is already in the store, this is added to the returned object(s) in the 'root', alongside the `attributes`. For items with a single relationship, the object is placed directly under the `relName` - for mutiple items, they are indexed by id:

```js
// Assuming the store is as follows:
store = {
  widget: {
    '1': {
      name: 'sprocket',
      _jv: {
        relationships: {
          parts: {
            data: {
              type: 'widget',
              id: '2',
            },
          },
        },
      },
    },
    '2': {
      name: 'cog',
    },
  },
}

// Get widget/1, with related items

// Either:

// (Note the use of include to ensure `parts` is in the store)
let item1 = await this.$store.dispatch('jv/get', 'widget/1', [{ include: 'parts' }])


// OR...

let item1 = this.$store.getters['jv/get']('widget/1')

// This will return:
{
  name: 'sprocket',
  parts: {
    name: 'cog'
    _jv: { /* ... */ }
  },
  _jv: {
    id: '1',
    type: 'widget',
  },
}

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

## Configuration

A config object can be passed to jsonapiModule when instantiating. It will override the default options

```js
const config = { jvtag: '_splat' }
jm = jsonapiModule(api, config)
```

### Config Options

- `jvtag` - The tag in restructured objects to hold object metadata (defaults to `_jv`)
- `followRelationshipsData` - Whether to follow and expand relationships and store them alongside attribrutes in the item 'root' (defaults to `true`)
- `preserveJson` - Whether actions should return the API response json (minus `data`) in `_jv/json` (for access to meta etc) (defaults to `false`)
- `actionStatusCleanAge` - What age must action status records be before they are removed (defaults to 600 seconds). Set to `0` to disable.

## Restructured Data

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

has to be accessed as `record.attributes.color`

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

Which is easier to work with, as lookups are now top-level, e.g. `record.name`

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
    "1": {},
    "2": {}
  },
  "doohickey": {
    "20": {}
  }
}
```

## Development

Any bugs, enhancements or questions welcome as Issues (or even PRs!)

Development is currently being done with [yarn](https://yarnpkg.com/en/) - `npm` should work, but if you hit unexpected issues, please try `yarn` before filing a bug.

### Setup

Having cloned this repository, simply run:

`yarn`

This should pull in all dependencies and development dependencies.

### Testing

There are several scripts set up in `package.json`:

`yarn unit` - Run the unit tests (uses `karma`, `mocha`, `chai`, `sinon`)

`yarn e2e` - Run the e2e tests (uses `nightwatch`)

`yarn testapp` - Runs the example `testapp` used in e2e testing for interactive testing/debugging.

`yarn fakeapiserver` - Runs a fake JSONAPI server used by the testapp for interactive testing/debugging.

`yarn test` - Runs both unit and e2e tests. (Used by `travis`).

_Note_ - All code is pre-processed with `babel` and `eslint` when testing for backwards compatability and linting.

### Coding Standards

Please follow these guidelines when writing and submitting code:

- **eslint** - This is run over both the main code and the test suite during tests. See `.eslint.rc.js` for changes to the default rules.

- **>= ES6** - Please try to use ES6 and newer methods (matching the policy that `Vue` has).

- **Tests** - This project aspires to test-driven development. Please submit unit tests (and ideally e2e tests) with all PRs (unless there's a good reason not to).

- **Versioning** - Semantic versioning should be used, see https://semver.org for details.

- **Continuous Integration** - The project uses [travis(https://travis-ci.com) to run tests against all submissions - PRs that are not passing will not be accepted (without good reason).

- **Specific Commits** - Please make all commits/PRs as atomic and specific as possible.
