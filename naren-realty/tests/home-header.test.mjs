import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import * as jsxRuntime from "react/jsx-runtime";
import ts from "typescript";

const source = await readFile(new URL("../app/components/HomeHeader.tsx", import.meta.url), "utf8");
const code = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022 },
}).outputText;

function renderMenu(session) {
  const states = [true, session, false, "", false];
  const exports = {};
  vm.runInNewContext(code, {
    exports,
    require(name) {
      if (name === "react/jsx-runtime") return jsxRuntime;
      if (name === "react") return {
        useState: () => [states.shift(), () => {}],
        useEffect: () => {},
        useRef: () => ({ current: null }),
      };
      if (name === "next/link") return { default: ({ href, children, ...props }) => React.createElement("a", { href, ...props }, children) };
      if (name === "../lib/supabase") return { supabase: {} };
      if (name === "../lib/supabase-browser") return { createSupabaseBrowserClient: () => ({}) };
      throw new Error(`Unexpected module: ${name}`);
    },
  });
  return renderToStaticMarkup(React.createElement(exports.default));
}

test("logged-out menu exposes login and signup but not admin controls", () => {
  const html = renderMenu({ customer: false, serverUser: false, admin: false });
  assert.match(html, /href="\/list-property"/);
  assert.match(html, /href="\/account#login"/);
  assert.match(html, /href="\/account#signup"/);
  assert.doesNotMatch(html, /Admin Dashboard|Logout/);
  assert.match(html, /Refer &amp; Earn/);
  assert.match(html, /Referral Progress/);
});

test("customer menu shows account and logout but not admin dashboard", () => {
  const html = renderMenu({ customer: true, serverUser: false, admin: false });
  assert.match(html, /My Account/);
  assert.match(html, /Logout/);
  assert.doesNotMatch(html, /Admin Dashboard|href="\/account#login"/);
});

test("only verified admin state shows dashboard", () => {
  const html = renderMenu({ customer: false, serverUser: true, admin: true });
  assert.match(html, /href="\/admin"/);
  assert.match(html, /Admin Dashboard/);
  assert.match(html, /My Account/);
  assert.match(html, /Logout/);
  assert.doesNotMatch(renderMenu({ customer: false, serverUser: true, admin: false }), /Admin Dashboard/);
});
