import assert from "node:assert/strict";
import test from "node:test";
import { safeNext } from "../src/lib/links.ts";

test("safeNext only allows paths on this site", () => {
  for (const bad of ["//evil.com", "/\\evil.com", "/\t/evil.com", "/\n/evil.com", "/\r/evil.com", "https://evil.com", "", null])
    assert.equal(safeNext(bad), "/events", JSON.stringify(bad));
  assert.equal(safeNext("/e/devfest-ilorin?code=ABC123"), "/e/devfest-ilorin?code=ABC123");
});
