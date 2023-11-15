import { beforeEach, describe, expect, test } from 'vitest'
import { makeApi } from '../server'
let api

import createJsonapiModule from '../utils/createJsonapiModule'

describe('create', function () {
  let jsonapiModule

  beforeEach(function () {
    [ api ] = makeApi()
    jsonapiModule = createJsonapiModule(api)
  })

  test('should be an alias for post', function () {
    expect(jsonapiModule.actions.create).to.equal(jsonapiModule.actions.post)
  })
})
