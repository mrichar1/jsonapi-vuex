import sinon from 'sinon'

export default function (jsonapiModule) {
  if (!jsonapiModule) {
    throw new Error('No jsonapiModule passed to stub context creator')
  }

  const stubContext = {
    getters: {
      get: sinon.stub().returns({}),
    },
    commit: sinon.stub(),
    // Map dispatch to jm.actions, with this stubContext as its context
    dispatch: (method, data) => {
      return jsonapiModule.actions[method](stubContext, data)
    },
  }

  return stubContext
}
