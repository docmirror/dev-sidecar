const assert = require("node:assert");
const expect = require("chai").expect;
describe("test", () => {
	it("regexp", () => {
		const test = "^/[^/]+/[^/]+(?:/releases(?:/.*)?)?$";
		const reg = new RegExp(test);

		const ret = reg.test("/docmirror/dev-sidecar/releases/tag");
		console.log(ret);
		assert.strictEqual(ret, true);

		expect(ret).to.equal(true);
	});
});
