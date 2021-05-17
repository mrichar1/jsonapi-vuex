import { createStore } from 'vuex'
import axios from 'axios'
import { jsonapiModule } from '../../../src/jsonapi-vuex'

const api = axios.create({
  // connect to local jsonapi-mock server
  baseURL: 'http://localhost:3000',
  headers: {
    'Content-Type': 'application/vnd.api+json',
    Accept: 'application/vnd.api+json',
  },
})

export const store = createStore({
  strict: process.env.NODE_ENV !== 'production',
  modules: {
    jv: jsonapiModule(api, {}),
  },
})
