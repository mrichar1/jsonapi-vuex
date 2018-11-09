import Vue from 'vue'
import Vuex from 'vuex'
import axios from 'axios';
import { jsonapiModule } from '../../../src/jsonapi-vuex';


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
})
