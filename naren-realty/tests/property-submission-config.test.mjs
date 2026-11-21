import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";

const source = await readFile(new URL("../app/lib/property-submission-config.ts", import.meta.url), "utf8");
const code = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const calls = [];
const errors = [];
const environment = { env: {} };
let bucketResult;
let bucketFailure;
const modules = {
  "server-only": {},
  "./private-submission-server": {
    createPrivateSubmissionClient() {
      calls.push("client");
      return {
        storage: {
          async getBucket(name) {
            calls.push(name);
            if (bucketFailure) throw bucketFailure;
            return bucketResult;
          },
        },
      };
    },
  },
  "./property-submission-validation": {
    MAX_SUBMISSION_PHOTO_BYTES: 5 * 1024 * 1024,
    SUPPORTED_SUBMISSION_PHOTO_TYPES: ["image/jpeg", "image/png", "image/webp"],
  },
};
const exports = {};
vm.runInNewContext(code, {
  exports,
  process: environment,
  console: { error(...args) { errors.push(args); } },
  require(name) {
    assert.ok(Object.hasOwn(modules, name), name);
    return modules[name];
  },
});

test("private uploads require credentials and a private bucket with matching restrictions", async () => {
  calls.length = 0;
  errors.length = 0;
  environment.env = {};
  assert.equal(await exports.propertySubmissionUploadsReady(), false);
  assert.deepEqual(calls, []);

  environment.env = {
    NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
    SUPABASE_SERVICE_ROLE_KEY: "test-only-key",
  };
  bucketFailure = null;
  bucketResult = {
    data: {
      id: "private-property-submissions",
      public: false,
      file_size_limit: 5 * 1024 * 1024,
      allowed_mime_types: ["image/webp", "image/jpeg", "image/png"],
    },
    error: null,
  };
  assert.equal(await exports.propertySubmissionUploadsReady(), true);

  for (const data of [
    { ...bucketResult.data, public: true },
    { ...bucketResult.data, file_size_limit: 10 * 1024 * 1024 },
    { ...bucketResult.data, allowed_mime_types: ["image/jpeg", "image/png"] },
    { ...bucketResult.data, allowed_mime_types: ["image/jpeg", "image/png", "image/webp", "image/gif"] },
    { ...bucketResult.data, id: "other-bucket" },
  ]) {
    bucketResult = { data, error: null };
    assert.equal(await exports.propertySubmissionUploadsReady(), false);
  }

  bucketResult = { data: null, error: { name: "StorageError" } };
  assert.equal(await exports.propertySubmissionUploadsReady(), false);
  bucketFailure = new Error("network unavailable");
  assert.equal(await exports.propertySubmissionUploadsReady(), false);
  assert.ok(errors.length >= 7);
});
