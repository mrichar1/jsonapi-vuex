import { beforeEach, describe, expect, test } from 'vitest'
import { makeApi } from '../server'
let api

import createJsonapiModule from '../utils/createJsonapiModule'

describe('update', function () {
  let jsonapiModule

  beforeEach(function () {
    ;[api] = makeApi()
    jsonapiModule = createJsonapiModule(api)
  })

  test('should be an alias for patch', function () {
    expect(jsonapiModule.actions.update).to.equal(jsonapiModule.actions.patch)
  })
})
