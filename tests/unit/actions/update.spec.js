import createJsonapiModule from '../utils/create-jsonapi-module';

describe("update", function() {
  let jsonapiModule;

  beforeEach(function() {
    jsonapiModule = createJsonapiModule(this.api);
  });

  it("should be an alias for patch", function() {
    expect(jsonapiModule.actions.update).to.equal(jsonapiModule.actions.patch)
  })
})
