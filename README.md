# jsonapi-vuex

A module to access JSONAPI data from a Vuex store, restructured for ease of use.

This project was inspired by https://codingitwrong.com/2018/06/18/vuex-jsonapi-a-zero-config-data-layer.html

## Features

* Creates a Vuex module to store API data.
* High-level methods to wrap common RESTful operations (GET, POST, PUT etc).
* Normalizes data in the store, making record handling easier.
* Uses Axios (or your own axios-like module) as the HTTP client.

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

There are 4 actions (with aliases): `get` (`fetch`), `post` (`create`), `patch` (`update`), and `delete`.

All actions take an argument in the form of a normalized record, e.g.:

```
const new_widget = {
  'name': 'sprocket',
  'color': 'black',
  '_jv': {
    'type': 'widget',
    'id': '1'
  }
}

// To create a new widget in the API, using a normalized object:
this.$store.dispatch('jv/post', new_widget)
  .then(data => {
    console.log(data)
  })

```

Actions which take no other arguments apart from the record (`get` and `delete`) also accept a string which matches the path to fetch, e.g.:

 * `widget` - get all records from the `widget` endpoint.
 * `widget/id` - get the record with matching `id` frmo the `widget` endpoint.

To fetch all `widgets` from the API, using string notation:

```
// Get all records from the 'widget' endpoint
this.$store.dispatch('jv/get', 'widget')
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
