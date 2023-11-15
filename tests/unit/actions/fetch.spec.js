import { beforeEach, describe, expect, test } from 'vitest'
import { makeApi } from '../server'
let api

import createJsonapiModule from '../utils/createJsonapiModule'

describe('fetch', function () {
  let jsonapiModule

  beforeEach(function () {
    ;[api] = makeApi()
    jsonapiModule = createJsonapiModule(api)
  })

  test('should be an alias for get', function () {
    expect(jsonapiModule.actions.fetch).to.equal(jsonapiModule.actions.get)
  })
})
