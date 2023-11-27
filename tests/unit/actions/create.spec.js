import { beforeEach, describe, expect, test } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import sinon from 'sinon'
import { makeApi } from '../server'
let api

import defaultJsonapiStore from '../utils/defaultJsonapiStore'

describe('create', function () {
  let store

  beforeEach(function () {
    ;[api] = makeApi()
    setActivePinia(createPinia())
    let { jsonapiStore } = defaultJsonapiStore(api)
    store = jsonapiStore()

  })

  test('should be an alias for post', function () {
    let storeMock = sinon.stub(store, 'post')
    store.create()
    expect(storeMock.calledOnce).to.be.true
  })
})
