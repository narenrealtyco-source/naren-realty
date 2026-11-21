import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";

const source = await readFile(new URL("../app/lib/supabase-properties.ts", import.meta.url), "utf8");
const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;

function harness({ error = null } = {}) {
  const calls = { selects: [], ranges: [], statuses: [] };
  const rows = Array.from({ length: 101 }, (_, index) => ({ id: index }));
  const supabase = {
    from(table) {
      assert.equal(table, "properties");
      return { select(columns, options) {
        calls.selects.push(columns);
        assert.equal(options.count, "exact");
        return { eq(field, value) {
          calls.statuses.push([field, value]);
          return { order() { return { async range(start, end) {
            calls.ranges.push([start, end]);
            return { data: error ? null : rows.slice(start, end + 1), error, count: error ? null : rows.length };
          } }; } };
        } };
      } };
    },
    storage: { from() { return { getPublicUrl: () => ({ data: { publicUrl: "url" } }) }; } },
  };
  const exports = {};
  vm.runInNewContext(code, { exports, Error, console: { error() {} }, require(name) {
    if (name === "server-only") return {};
    if (name === "./supabase-server") return { createSupabaseServerClient: async () => supabase };
    if (name === "./public-property-mapping") return { mapPublicProperty: (row) => row };
    throw new Error(`Unexpected dependency ${name}`);
  } });
  return { ...exports, calls };
}

test("public query requests only approved rows, limited projections, and all pages", async () => {
  const { getApprovedPropertiesFromSupabase, calls } = harness();
  assert.equal((await getApprovedPropertiesFromSupabase()).length, 101);
  assert.deepEqual(calls.ranges, [[0, 99], [100, 199]]);
  assert.deepEqual(calls.statuses, [["status", "approved"], ["status", "approved"]]);
  assert.equal(calls.selects[0].includes("details,"), false);
  assert.equal(calls.selects[0].includes("public_listing:details->publicListing"), true);
  assert.equal(calls.selects[0].includes("phone"), false);
});

test("public query surfaces database errors", async () => {
  const { getApprovedPropertiesFromSupabase } = harness({ error: { code: "failure" } });
  await assert.rejects(getApprovedPropertiesFromSupabase(), /could not be loaded/);
});
