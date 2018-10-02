import { example } from '../../src/example.js';

describe("Test that things work", function() {

it("true should be true", function() {
    expect(true).toBe(true);
  });
it("example should also be true", function() {
    expect(example).toBe(true);
  });
});
