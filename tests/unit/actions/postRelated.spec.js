import { expect } from 'chai'

import createStubContext from '../stubs/context'
import createJsonapiModule from '../utils/createJsonapiModule'
import { jsonFormat as createJsonWidget1, normFormat as createNormWidget1 } from '../fixtures/widget1'

describe('postRelated', function () {
  let normWidget1, jsonWidget1, jsonapiModule, stubContext

  beforeEach(function () {
    normWidget1 = createNormWidget1()
    jsonWidget1 = createJsonWidget1()

    jsonapiModule = createJsonapiModule(this.api)
    stubContext = createStubContext(jsonapiModule)
  })

  it('Should throw an error if passed an object with no type or id', async function () {
    try {
      await jsonapiModule.actions.postRelated(stubContext, { _jv: {} })
      throw 'Should have thrown an error (no id)'
    } catch (error) {
      expect(error).to.equal('No type/id specified')
    }
  })

  it('Should throw an error if passed an object with no relationships', async function () {
    try {
      await jsonapiModule.actions.postRelated(stubContext, { _jv: { type: 'widget', id: 1 } })
      throw 'Should have thrown an error (no relationships)'
    } catch (error) {
      expect(error).to.equal('No relationships specified')
    }
  })

  it('should make a post request for the object passed in.', async function () {
    this.mockApi.onPost().replyOnce(204)
    this.mockApi.onGet().replyOnce(200, { data: jsonWidget1 })

    const rel = { data: { type: 'widget', id: '2' } }
    normWidget1['_jv']['relationships'] = { widgets: rel }

    await jsonapiModule.actions.postRelated(stubContext, normWidget1)
    // Expect a post call to rel url, with rel payload, then get object to update store
    expect(this.mockApi.history.post[0].url).to.equal('widget/1/relationships/widgets')
    expect(this.mockApi.history.post[0].data).to.deep.equal(JSON.stringify(rel))
    expect(this.mockApi.history.get[0].url).to.equal('widget/1')
  })

  it('should handle multiple relationships', async function () {
    this.mockApi.onPost().reply(204)
    this.mockApi.onGet().replyOnce(200, { data: jsonWidget1 })

    const rel1 = { data: { type: 'widget', id: '2' } }
    const rel2 = { data: { type: 'doohickey', id: '3' } }
    normWidget1['_jv']['relationships'] = { widgets: rel1, doohickeys: rel2 }

    await jsonapiModule.actions.postRelated(stubContext, normWidget1)
    expect(this.mockApi.history.post[0].url).to.equal('widget/1/relationships/widgets')
    expect(this.mockApi.history.post[0].data).to.deep.equal(JSON.stringify(rel1))
    expect(this.mockApi.history.post[1].url).to.equal('widget/1/relationships/doohickeys')
    expect(this.mockApi.history.post[1].data).to.deep.equal(JSON.stringify(rel2))
    expect(this.mockApi.history.get[0].url).to.equal('widget/1')
    // Only get the object once at end
    expect(this.mockApi.history.get.length).to.equal(1)
  })

  it('Should handle API errors (in the data)', async function () {
    this.mockApi.onPost().reply(500)

    const rel = { data: { type: 'widget', id: '2' } }
    normWidget1['_jv']['relationships'] = { widgets: rel }

    try {
      await jsonapiModule.actions.postRelated(stubContext, normWidget1)
    } catch (error) {
      expect(error.response.status).to.equal(500)
    }
  })
})
