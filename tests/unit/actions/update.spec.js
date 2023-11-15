import { beforeEach, describe, expect, test } from 'vitest'
import { makeApi } from '../server'
let api, mockApi

import createJsonapiModule from '../utils/createJsonapiModule'

describe('update', function () {
  let jsonapiModule

  beforeEach(function () {
    [api, mockApi] = makeApi()
    jsonapiModule = createJsonapiModule(api)
  })

  test('should be an alias for patch', function () {
    expect(jsonapiModule.actions.update).to.equal(jsonapiModule.actions.patch)
  })
})
