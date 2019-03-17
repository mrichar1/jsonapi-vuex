// server.js
var FakeServer = require('fake-json-api-server/src/nodeServer')

var resources = require('./testapp.json')

new FakeServer({
  port: 3000,
  resources: resources,
})
