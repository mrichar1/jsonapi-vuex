import sinon from "sinon";

export default function(jsonapiModule) {
  if (!jsonapiModule) {
    throw new Error("No jsonapiModule passed to stub context creator");
  }

  const stub_context = {
    getters: {
      get: sinon.stub().returns({})
    },
    commit: sinon.stub(),
    // Map dispatch to jm.actions, with this stub_context as its context
    dispatch: (method, data) => {
      return jsonapiModule.actions[method](stub_context, data);
    }
  };

  return stub_context;
}
