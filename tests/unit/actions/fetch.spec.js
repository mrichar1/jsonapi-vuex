import { beforeEach, describe, expect, test } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import sinon from 'sinon'
import { makeApi } from '../server'
let api

import defaultJsonapiStore from '../utils/defaultJsonapiStore'

describe('fetch', function () {
  let store

  beforeEach(function () {
    ;[api] = makeApi()
    setActivePinia(createPinia())
    let { jsonapiStore } = defaultJsonapiStore(api)
    store = jsonapiStore()

  })

  test('should be an alias for get', function () {
    let storeMock = sinon.stub(store, 'get')
    store.fetch()
    expect(storeMock.calledOnce).to.be.true
  })
})
