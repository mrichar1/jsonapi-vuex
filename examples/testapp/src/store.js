import axios from 'axios'
import { jsonapiStore } from '../../../src/jsonapi-vuex'

const api = axios.create({
  // connect to local jsonapi-mock server
  baseURL: 'http://localhost:3000',
  headers: {
    'Content-Type': 'application/vnd.api+json',
    Accept: 'application/vnd.api+json',
  },
})

const testAppStore = jsonapiStore(api, {})

export { testAppStore }
