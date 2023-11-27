import { beforeEach, describe, expect, test } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import sinon from 'sinon'
import { makeApi } from '../server'
let api

import defaultJsonapiStore from '../utils/defaultJsonapiStore'

describe('update', function () {
  let store

  beforeEach(function () {
    ;[api] = makeApi()
    setActivePinia(createPinia())
    let { jsonapiStore } = defaultJsonapiStore(api)
    store = jsonapiStore()

  })

  test('should be an alias for patch', function () {
    let storeMock = sinon.stub(store, 'patch')
    store.update()
    expect(storeMock.calledOnce).to.be.true
  })
})
