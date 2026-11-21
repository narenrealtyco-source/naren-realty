import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";
import * as validation from "../app/lib/property-submission-validation.ts";

const source = await readFile(new URL("../app/lib/publication-coordinator.ts", import.meta.url), "utf8");
const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
const exports = {};
vm.runInNewContext(code, {
  exports, Error, Set,
  require(name) {
    assert.equal(name, "./property-submission-validation");
    return validation;
  },
  console: { error() {} },
});
const { coordinatePublication } = exports;
const id = "11aa1111-1111-4111-8111-111111111111";
const owner = "22bb2222-2222-4222-8222-222222222222";
const photo1 = "33cc3333-3333-4333-8333-333333333333";
const photo2 = "44dd4444-4444-4444-8444-444444444444";
const submission = {
  id, user_id: owner, status: "approved", title: "Apartment", category: "Rental",
  locality: "Wakad", address: "private address", price: 25000, area: 650,
  description: "private description", email: "private", details: { phone: "private" },
  photo_paths: [`${owner}/${id}/${photo1}`, `${owner}/${id}/${photo2}`],
};

function harness() {
  let state = "ready";
  let errorAt = -1;
  let block;
  const calls = { copies: [], finalized: [], failures: 0 };
  const ports = {
    async claim() {
      if (state === "published") return { kind: "published" };
      if (state === "copying") return { kind: "busy" };
      state = "copying";
      return { kind: "claimed", token: "lease", submission };
    },
    async copyAndVerify(source, destination) {
      calls.copies.push({ source, destination });
      if (block) await block;
      if (calls.copies.length === errorAt) throw new Error("Copy failed");
    },
    async finalize(_id, token, property) {
      assert.equal(token, "lease");
      calls.finalized.push(property);
      state = "published";
    },
    async fail() { calls.failures++; state = "failed"; },
  };
  return { ports, calls, setErrorAt: (value) => { errorAt = value; }, setBlock: (value) => { block = value; } };
}

test("duplicate concurrent and repeated publication cannot finalize twice", async () => {
  const { ports, calls, setBlock } = harness();
  let unblock;
  setBlock(new Promise((resolve) => { unblock = resolve; }));
  const first = coordinatePublication(id, ports);
  await new Promise((resolve) => setTimeout(resolve, 0));
  await assert.rejects(coordinatePublication(id, ports), /already in progress/);
  unblock();
  assert.equal(await first, "published");
  assert.equal(await coordinatePublication(id, ports), "already-published");
  assert.equal(calls.finalized.length, 1);
});

test("partial copy failure does not finalize and retry uses deterministic destinations", async () => {
  const { ports, calls, setErrorAt } = harness();
  setErrorAt(2);
  await assert.rejects(coordinatePublication(id, ports), /Copy failed/);
  assert.equal(calls.finalized.length, 0);
  assert.equal(calls.failures, 1);
  setErrorAt(-1);
  assert.equal(await coordinatePublication(id, ports), "published");
  assert.equal(calls.copies[0].destination, calls.copies[2].destination);
  assert.equal(calls.finalized.length, 1);
});

test("publication passes only approved fields and derives owner from submission", async () => {
  const { ports, calls } = harness();
  await coordinatePublication(id, ports);
  const property = calls.finalized[0];
  assert.equal(property.owner_id, owner);
  assert.deepEqual(Object.keys(property.details), ["carpetArea"]);
  const payload = JSON.stringify(property);
  for (const privateValue of ["private address", "private description", "private", "email", "phone"]) {
    assert.equal(payload.includes(privateValue), false);
  }
});

test("nonapproved or mismatched ownership photo paths never reach publication", async () => {
  for (const changed of [{ status: "pending" }, { photo_paths: [`other/${id}/${photo1}`] }]) {
    const calls = { copies: 0, finalized: 0, failed: 0 };
    const ports = {
      async claim() { return { kind: "claimed", token: "t", submission: { ...submission, ...changed } }; },
      async copyAndVerify() { calls.copies++; },
      async finalize() { calls.finalized++; },
      async fail() { calls.failed++; },
    };
    await assert.rejects(coordinatePublication(id, ports));
    assert.equal(calls.copies, 0);
    assert.equal(calls.finalized, 0);
    assert.equal(calls.failed, 1);
  }
});

test("lost finalize response does not trigger a second publication on retry", async () => {
  let state = "ready";
  let finalizations = 0;
  const ports = {
    async claim() {
      if (state === "published") return { kind: "published" };
      state = "copying";
      return { kind: "claimed", token: "lease", submission };
    },
    async copyAndVerify() {},
    async finalize() { finalizations++; state = "published"; throw new Error("response lost"); },
    async fail() { if (state === "copying") state = "failed"; },
  };
  await assert.rejects(coordinatePublication(id, ports), /response lost/);
  assert.equal(await coordinatePublication(id, ports), "already-published");
  assert.equal(finalizations, 1);
});
