import sinon from 'sinon';

export default function(jsonapiModule) {
  const stub_context = {
    getters: {
      get: sinon.stub().returns({})
    },
    commit: sinon.stub(),
    // Map dispatch to jm.actions, with this stub_context as it's context
    dispatch: (method, data) => {
      return jsonapiModule.actions[method](stub_context, data)
    }
  };

  return stub_context
}
