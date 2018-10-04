# jsonapi-vuex

A module to access JSONAPI data via a Vuex store, with added (de)normalization.

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
