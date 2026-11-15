import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import * as jsxRuntime from "react/jsx-runtime";
import ts from "typescript";

async function load(path, modules) {
  const source = await readFile(new URL(path, import.meta.url), "utf8");
  const code = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const exports = {};
  vm.runInNewContext(code, {
    exports,
    process: { env: {} },
    require(name) {
      if (name === "react/jsx-runtime") return jsxRuntime;
      assert.ok(Object.hasOwn(modules, name), name);
      return modules[name];
    },
  });
  return exports;
}

const link = { default: ({ href, children, ...props }) => React.createElement("a", { href, ...props }, children) };
const empty = { default: () => null };

test("homepage referral action opens the referral page", async () => {
  const page = await load("../app/page.tsx", {
    react: { useState: (initial) => [initial, () => {}], useEffect() {} },
    "next/link": link,
    "./components/HomeHeader": empty,
    "./components/PropertyCard": empty,
    "./properties/actions": {},
    "./properties/visit-actions": {},
    "./lib/property-search": {},
    "./components/WhyChoose": empty,
    "./components/DesktopQuickNav": empty,
  });
  const html = renderToStaticMarkup(React.createElement(page.default));
  assert.match(html, /href="\/account\/referrals"[^>]*>Refer Now<\/a>/);
});

test("referral page keeps referral sharing disabled by default", async () => {
  const page = await load("../app/account/referrals/page.tsx", {
    react: { useState: (initial) => [initial, () => {}], useEffect() {} },
    "next/link": link,
    "../../lib/customers": { getCustomerSession: async () => null },
    "../../lib/supabase": { supabase: { rpc: async () => ({ data: null, error: null }) } },
  });
  const html = renderToStaticMarkup(React.createElement(page.default));
  assert.match(html, /Referral registration is not active yet/);
  assert.doesNotMatch(html, /Copy Link|Share on WhatsApp/);
});
