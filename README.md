# jsonapi-vuex

[![Build Status](https://travis-ci.com/mrichar1/jsonapi-vuex.svg?branch=master)](https://travis-ci.com/mrichar1/jsonapi-vuex)

A module to access JSONAPI data from an API, using a Vuex store, restructured to make life easier.

This project was inspired by https://codingitwrong.com/2018/06/18/vuex-jsonapi-a-zero-config-data-layer.html

## Features

* Creates a [Vuex](https://vuex.vuejs.org/) module to store API data.
* High-level methods to wrap common RESTful operations (GET, POST, PUT, DELETE).
* Restructures/normalizes data, making record handling easier.
* Makes fetching related objects easy.
* Uses [Axios](https://github.com/axios/axios) (or your own axios-like module) as the HTTP client.
* Use [jsonpath](https://github.com/dchester/jsonpath) for filtering when getting objects from the store.

## Setup

Having created a Vue project, simply add the module to your store.js, passing it an axios-like instance:

```
import Vue from 'vue';
import Vuex from 'vuex';
import axios from 'axios';
import { jsonapiModule } from 'jsonapi-vuex';

Vue.use(Vuex)

const api = axios.create({
  baseURL: 'https://api.example.com/1/api/',
  headers: {
    'Content-Type': 'application/vnd.api+json'
  }
})

export default new Vuex.Store({
  modules: {
    'jv': jsonapiModule(api)
  }

});
```

## Usage

The most common way to access the API and update the store is through high-level `actions` - though `getters` (and `mutations`) can be used directly if required.

### Actions

The usual way to use this module is to use `actions` wherever possible. All actions are asynchronous, and both query the API and update the store, then return data in a normalized form.

There are 4 actions (with aliases): `get` (`fetch`), `post` (`create`), `patch` (`update`), and `delete` which correspond to RESTful methods. There is also a `getRelated` action which fetches a record's related items.

#### RESTful actions

These actions take 2 arguments: the path/object to be acted on, and an (optional) [`axios` config object](The first argument is an object containing [restructured data](#restructured-data).

Note: Since the `dispatch` method can only accept a single argument, if both arguments are used, the argument must be an array.

The first argument is an object containing [restructured data](#restructured-data). Actions which take no `data` argument apart from the record (`get` and `delete`) can also accept a string which matches the path to fetch. This means you don't need to create an 'empty' restructured data object to get or delete a record. some examples:

```
// Restructured representation of a record
const new_widget = {
  'name': 'sprocket',
  'color': 'black',
  '_jv': {
    'type': 'widget',
    'id': '1'
  }
}

// Request Query params (JSONAPI options, auth tokens etc)
const params = {
  'token': 'abcdef123456'
}

// To get all items in a collection, using a sring path:
this.$store.dispatch('jv/get', "widget")
  .then(data => {
    console.log(data)
  })

// Get a specific record from the 'widget' endpoint, passing parameters to axios:
this.$store.dispatch('jv/get', 'widget/1', [{params: params}])
  .then(data => {
    console.log(data)
  })

// Create a new widget in the API, using a restructured object, and passing parameters to axios:
this.$store.dispatch('jv/post', [new_widget, {params: params}])
  .then(data => {
    console.log(data)
  })

```

#### getRelated

Like the RESTful actions, this takes 2 arguments - the path/object to be acted on, and an axios config object. It returns a deeply nested restructured tree - `relationship -> type -> id -> data`.

Note: `getRelated` using a string only accepts a path to a specific record (with an id), not a collection.

```
// Assuming the API holds the following data
jsonapi = {
  data: {
    type: 'widget',
    id: '1'
  },
  relationships: {
    'widgets': {
      data: {
        type: 'widget',
        id: '2'
    }
    'doohickeys': {
      data: {
        type: 'doohickey',
        id: '10'
      }
    }
  }
}

// Get all of widget 1's related items (widgets and doohickeys)
this.$store.dispatch('jv/getRelated', 'widget/1')
  .then(data => {
    console.log(data)
  })

// Get only the items in the 'widgets' relationship
this.$store.dispatch('jv/getRelated', 'widget/1/widgets')
  .then(data => {
    console.log(data)
  })

```


### Getters

Since `actions` return results from the store, there is less need to use `getters` directly. However you may wish to call `get` directly, either for performance (to avoid revisiting the API) or for computed properties.

```
computed: {

  ...mapGetters({
    // Map 'jv/get' as a computed property 'get'
    'get': 'jv/get'
  }),
  // Create a computed property that calls the getter with normalized data
  'getWidget': function() {
    return this.$store.getters['jv/get']({'_jv': {'type': 'Widget'}})
  }
}
```

`get` takes an optional 2nd argument - a `jsonpath` string to filter the record(s) which are being retrieved. See the project page for [JSONPath Syntax](https://github.com/dchester/jsonpath#jsonpath-syntax)

```

// Assuming the store is as follows:
store = {
  'widget' : {
    '1': {
      'name': 'sprocket',
      'color': 'black',
    },
    '2': {
      'name': 'cog',
      'color': 'red'
    }
  }
}

// Get all widgets that are red:
this.$store.getters['jv/get']('widget', '[?(@.color=="red")]')

// Note that filters can create impossible conditions
// The following will return empty, as widget 1 is not red
this.$store.getters['jv/get']('widget/1', '[?(@.color=="red")]')

```


## Restructured Data

JSONAPI is an extremely useful format for clearly interacting with an API - however it is less useful for the end developer, who is generally more interested in the data contained in a record than the structure surrounding it.

In this module we 'reverse' the JSONAPI data into a form where data attributes become top-level keys, and JSONAPI-specific data is moved down under another key: `_jv`.

For example, the JSONAPI record:

```
{
  id: '1',
  type: 'widget'
  attributes: {
    name: 'sprocket',
    color: 'black'
  },
  meta: {...}
}
```

has to be accessed as `record.attributes.color`

This module would restructure this record to be:

```
{
  name: 'sprocket',
  color: 'black',
  _jv: {
    id: '1',
    type: 'widget'
    meta: {...}
  }
}
```

Which is easier to work with, as lookups are now top-level, e.g. `record.name`

In cases where there are multiple records being returned in an object, the id is used as the key (though this is ignored in the code, and the 'real' id is always read from `_jv`):

```
{
  1: {
    name: 'sprocket',
    color: 'black'
  },
  2: {
    name: 'cog',
    color: 'red'
  }
}
```

These are accessed as `record.1.name` or `record.2.color`, or if a list is needed, via `Object.values(record)`.

The above structure is actually how records are maintained in the store, nested below the `endpoint`:

```
{
  widget: {
    1: {...},
    2: {...}
  },
  doohickey: {
    20: {...},
  }
}
```
