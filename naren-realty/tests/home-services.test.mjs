import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";
import * as services from "../app/lib/home-services.ts";

const source = await readFile(new URL("../app/home-services/actions.ts", import.meta.url), "utf8");
const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;

function form() {
  const value = new FormData();
  for (const [key, text] of Object.entries({ service: "home-loan", name: "Customer", mobile: "9876543210", requirement: "Advice", preferred_time: "Afternoon", customer_id: "forged" })) value.set(key, text);
  return value;
}

function action({ ready = true, user = { id: "verified" }, error = null } = {}) {
  const calls = [];
  const exports = {};
  vm.runInNewContext(code, { exports, console: { error() {} }, require(name) {
    if (name === "../lib/home-services") return services;
    if (name === "../lib/home-services-config") return { homeServicesReady: () => ready };
    if (name === "../lib/supabase-server") return { createSupabaseServerClient: async () => ({
      auth: { getUser: async () => ({ data: { user }, error: null }) },
      from(table) { return { insert: async (payload) => { calls.push({ table, payload }); return { error }; } }; },
    }) };
    throw new Error(`Unexpected dependency ${name}`);
  } });
  return { request: exports.requestHomeService, calls };
}

test("service catalogue contains the five requested service types", () => {
  assert.deepEqual(services.HOME_SERVICES.map((item) => item.slug), ["builder-projects", "home-interior", "legal-services", "home-loan", "nri-services"]);
  assert.equal(services.findHomeService("unknown"), undefined);
});

test("validation rejects unknown services, invalid contact and oversized requirements", () => {
  for (const [key, value] of [["service", "other"], ["service", "builder-projects"], ["mobile", "123"], ["name", " "], ["requirement", "a".repeat(2001)]]) {
    const data = form(); data.set(key, value);
    assert.throws(() => services.validateServiceEnquiry(data));
  }
});

test("setup guard and authentication prevent writes", async () => {
  for (const options of [{ ready: false }, { user: null }]) {
    const { request, calls } = action(options);
    assert.equal((await request({}, form())).status, "error");
    assert.equal(calls.length, 0);
  }
});

test("identity comes from database session and success requires saved enquiry", async () => {
  const ok = action();
  assert.equal((await ok.request({}, form())).status, "success");
  assert.equal(ok.calls[0].table, "home_service_enquiries");
  assert.equal(Object.hasOwn(ok.calls[0].payload, "customer_id"), false);
  const failed = action({ error: { code: "42501" } });
  assert.equal((await failed.request({}, form())).status, "error");
});

test("proposal restricts customer identity and status writes", async () => {
  const sql = await readFile(new URL("../supabase/migrations/0017_home_service_enquiries_proposal.sql", import.meta.url), "utf8");
  assert.match(sql, /customer_id uuid not null default auth\.uid\(\)/);
  assert.match(sql, /grant insert \(service, customer_name, mobile_number, requirement, preferred_time\)/);
  assert.match(sql, /using \(customer_id = auth\.uid\(\)\)/);
  assert.match(sql, /grant update \(status\)/);
  assert.match(sql, /using \(public\.is_admin\(\)\) with check \(public\.is_admin\(\)\)/);
});

test("service administration rejects unauthorized updates and confirms only saved changes", async () => {
  const file = await readFile(new URL("../app/admin/services/actions.ts", import.meta.url), "utf8");
  const script = ts.transpileModule(file, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
  for (const [admin, ready, error, expected] of [[false, true, null, "error"], [true, false, null, "error"], [true, true, { code: "42501" }, "error"], [true, true, null, "success"]]) {
    const calls = [];
    const exports = {};
    vm.runInNewContext(script, { exports, console: { error() {} }, require(name) {
      if (name === "next/cache") return { revalidatePath() {} };
      if (name === "../../lib/home-services-config") return { homeServicesReady: () => ready };
      if (name === "../../lib/supabase-server") return { requireAdmin: async () => {
        if (!admin) throw new Error("Forbidden");
        return { supabase: { from(table) { return { update(payload) {
          calls.push({ table, payload });
          return { eq() { return { select() { return { maybeSingle: async () => ({ data: error ? null : { id: "valid" }, error }) }; } }; } };
        } }; } } };
      } };
      throw new Error(`Unexpected dependency ${name}`);
    } });
    const data = new FormData();
    data.set("id", "11aa1111-1111-4111-8111-111111111111");
    data.set("status", "contacted");
    assert.equal((await exports.updateServiceEnquiry({}, data)).status, expected);
    assert.equal(calls.length, admin && ready ? 1 : 0);
  }
});
