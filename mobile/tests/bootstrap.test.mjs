import { test } from "node:test";
import assert from "node:assert/strict";
import { resolveBootstrap } from "../src/features/bootstrap/resolveBootstrap.ts";
const defaults = () => ({ readKey: async () => "stored", fetchProfile: async () => {}, checkRequiredPermissions: async () => true, isUnauthorized: error => error?.status === 401 });
test("first install does not fetch a profile or permissions", async () => {
  const deps = defaults(); deps.readKey = async () => null;
  deps.fetchProfile = async () => assert.fail("must not fetch");
  deps.checkRequiredPermissions = async () => assert.fail("must not check");
  assert.equal(await resolveBootstrap(deps), "needsOnboarding");
});
test("valid key and required permissions open tabs", async () => assert.equal(await resolveBootstrap(defaults()), "ready"));
test("missing required permission routes to permissions", async () => assert.equal(await resolveBootstrap({ ...defaults(), checkRequiredPermissions: async () => false }), "needsPermissions"));
test("401 requires onboarding", async () => assert.equal(await resolveBootstrap({ ...defaults(), fetchProfile: async () => { throw { status: 401 }; } }), "needsOnboarding"));
for (const error of [new Error("Network Error"), { code: "ECONNABORTED" }, { status: 500 }]) {
  test("request failure preserves account and offers retry: " + JSON.stringify(error), async () => assert.equal(await resolveBootstrap({ ...defaults(), fetchProfile: async () => { throw error; } }), "retry"));
}
test("permission check failure never creates another account", async () => assert.equal(await resolveBootstrap({ ...defaults(), checkRequiredPermissions: async () => { throw new Error("OS unavailable"); } }), "retry"));
test("secure storage failure offers retry", async () => assert.equal(await resolveBootstrap({ ...defaults(), readKey: async () => { throw new Error("Locked"); } }), "retry"));
