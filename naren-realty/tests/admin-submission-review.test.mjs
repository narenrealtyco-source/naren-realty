import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";

const id = "11aa1111-1111-4111-8111-111111111111";
const customer = "22bb2222-2222-4222-8222-222222222222";
const photo = "33cc3333-3333-4333-8333-333333333333";

async function load(path, modules) {
  const source = await readFile(new URL(path, import.meta.url), "utf8");
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const exports = {};
  vm.runInNewContext(code, {
    exports, Error, Response,
    console: { error() {} },
    require(name) {
      assert.ok(Object.hasOwn(modules, name), `unexpected module ${name}`);
      return modules[name];
    },
  });
  return exports;
}

async function actions({ admin = true, enabled = true, rpcError = null } = {}) {
  const calls = { rpc: [], paths: [] };
  const client = {
    async rpc(name, args) {
      calls.rpc.push({ name, args });
      return { data: name === "approve_and_publish_property_submission" ? id : null, error: rpcError };
    },
  };
  const exports = await load("../app/admin/submissions/actions.ts", {
    "next/cache": { revalidatePath: (path) => calls.paths.push(path) },
    "../../lib/property-submission-config": { propertySubmissionsEnabled: () => enabled },
    "../../lib/supabase-server": { requireAdmin: async () => {
      if (!admin) throw new Error("Forbidden");
      return { supabase: client, user: { id: "verified-admin" } };
    } },
  });
  return { ...exports, calls };
}

function form(reason = "Needs details") {
  const data = new FormData();
  data.set("submission_id", id);
  data.set("reason", reason);
  data.set("reviewed_by", "forged");
  data.set("status", "approved");
  return data;
}

test("non-admin and disabled review never call the database", async () => {
  for (const options of [{ admin: false }, { enabled: false }]) {
    const { approveSubmission, calls } = await actions(options);
    assert.equal((await approveSubmission({}, form())).status, "error");
    assert.equal(calls.rpc.length, 0);
  }
});

test("approval publishes through the authenticated RPC without browser-supplied fields", async () => {
  const { approveSubmission, calls } = await actions();
  const result = await approveSubmission({}, form());
  assert.equal(result.status, "success");
  assert.match(result.message, /published/);
  assert.equal(calls.rpc[0].name, "approve_and_publish_property_submission");
  assert.equal(calls.rpc[0].args.p_submission_id, id);
  assert.equal(Object.keys(calls.rpc[0].args).length, 1);
  assert.deepEqual(calls.paths, ["/admin/submissions", "/list-property", "/properties", `/properties/${id}`]);
});

test("rejection requires a reason and ignores forged decision", async () => {
  const { rejectSubmission, calls } = await actions();
  assert.equal((await rejectSubmission({}, form("   "))).status, "error");
  assert.equal((await rejectSubmission({}, form("a".repeat(2001)))).status, "error");
  assert.equal(calls.rpc.length, 0);
  assert.equal((await rejectSubmission({}, form("  Missing photos  "))).status, "success");
  assert.equal(calls.rpc[0].args.p_decision, "rejected");
  assert.equal(calls.rpc[0].args.p_feedback, "Missing photos");
});

test("invalid id and database conflicts are surfaced without success", async () => {
  const { rejectSubmission, calls } = await actions({ rpcError: { code: "P0001" } });
  const invalid = form();
  invalid.set("submission_id", "not-an-id");
  assert.equal((await rejectSubmission({}, invalid)).status, "error");
  assert.equal(calls.rpc.length, 0);
  assert.match((await rejectSubmission({}, form())).message, /already have been reviewed/);
  assert.equal(calls.paths.length, 0);
});

async function photoRoute({ admin = true, enabled = true, path = `${customer}/${id}/${photo}`, mime = "image/png" } = {}) {
  const calls = { lookups: 0, downloads: [] };
  const client = {
    from(table) {
      assert.equal(table, "property_submissions");
      calls.lookups++;
      return { select() { return { eq(_key, value) {
        assert.equal(value, id);
        return { async maybeSingle() { return { data: { user_id: customer, photo_paths: [path] }, error: null }; } };
      } }; } };
    },
    storage: { from(bucket) {
      assert.equal(bucket, "private-property-submissions");
      return { async download(name) {
        calls.downloads.push(name);
        return { data: new Blob(["image"], { type: mime }), error: null };
      } };
    } },
  };
  const exports = await load("../app/admin/submissions/[id]/photos/[index]/route.ts", {
    "../../../../../lib/property-submission-config": { propertySubmissionsEnabled: () => enabled },
    "../../../../../lib/supabase-server": { requireAdmin: async () => {
      if (!admin) throw new Error("Forbidden");
      return { supabase: client };
    } },
  });
  return { ...exports, calls };
}

test("private photo endpoint denies non-admins, disabled setup and mismatched paths", async () => {
  for (const options of [{ admin: false }, { enabled: false }, { path: `other/${id}/${photo}` }, { path: `${customer}/${id}/..` }]) {
    const { GET, calls } = await photoRoute(options);
    const response = await GET(new Request("http://localhost"), { params: Promise.resolve({ id, index: "0" }) });
    assert.ok(response.status >= 400);
    assert.equal(response.headers.get("cache-control"), "private, no-store");
    assert.equal(calls.downloads.length, 0);
  }
});

test("admin private photo access is non-cacheable and rejects unsafe types", async () => {
  for (const mime of ["image/png", "text/html"]) {
    const { GET, calls } = await photoRoute({ mime });
    const response = await GET(new Request("http://localhost"), { params: Promise.resolve({ id, index: "0" }) });
    assert.equal(response.status, mime === "image/png" ? 200 : 415);
    assert.equal(response.headers.get("cache-control"), "private, no-store");
    assert.equal(calls.downloads.length, 1);
    if (response.status === 200) assert.equal(response.headers.get("x-content-type-options"), "nosniff");
  }
});

test("cleanup action requires verified admin and configured storage", async () => {
  for (const [admin, enabled, expectedCalls] of [[false, true, 0], [true, false, 0], [true, true, 1]]) {
    let calls = 0;
    const actions = await load("../app/admin/submissions/cleanup-action.ts", {
      "../../lib/property-submission-config": { propertySubmissionsEnabled: () => enabled },
      "../../lib/supabase-server": { requireAdmin: async () => { if (!admin) throw new Error("Forbidden"); } },
      "../../lib/private-submission-server": {
        createPrivateSubmissionClient: () => ({}),
        reconcilePrivateSubmissions: async () => { calls++; return 1; },
      },
    });
    const result = await actions.cleanupPrivateSubmissions();
    assert.equal(calls, expectedCalls);
    assert.equal(result.status, expectedCalls ? "success" : "error");
  }
});
