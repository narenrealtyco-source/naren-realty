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
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  const exports = {};
  vm.runInNewContext(code, {
    exports,
    require(name) {
      if (name === "react/jsx-runtime") return jsxRuntime;
      if (name === "react") return React;
      assert.ok(Object.hasOwn(modules, name), `unexpected module ${name}`);
      return modules[name];
    },
  });
  return exports;
}

test("mobile navigation contains the five requested routes and highlights their sections", async () => {
  for (const [pathname, expected] of [["/", true], ["/properties", true], ["/properties/123", true], ["/home-services", true], ["/matches", true], ["/loans", true], ["/account", true], ["/admin", false], ["/list-property", false]]) {
    const component = await load("../app/components/MobileBottomNav.tsx", {
      "next/link": { default: ({ href, children, ...props }) => React.createElement("a", { href, ...props }, children) },
      "next/navigation": { usePathname: () => pathname },
    });
    const html = renderToStaticMarkup(React.createElement(component.default));
    if (!expected) {
      assert.equal(html, "");
      continue;
    }
    assert.match(html, /aria-label="Mobile navigation"/);
    for (const href of ["/properties", "/home-services", "/matches", "/loans", "/account"]) assert.ok(html.includes(`href="${href}"`));
    assert.doesNotMatch(html, /href="\/"/);
    assert.equal((html.match(/<a /g) ?? []).length, 5);
    if (pathname !== "/") assert.match(html, /aria-current="page"/);
    else assert.doesNotMatch(html, /aria-current="page"/);
    assert.match(html, /safe-area-inset-bottom/);
  }
});

test("visit dialog preserves its real inputs and has mobile-friendly slots", async () => {
  const component = await load("../app/properties/[id]/VisitRequestForm.tsx", {
    "next/link": { default: ({ href, children }) => React.createElement("a", { href }, children) },
    "../visit-actions": { requestVisit: async () => ({ status: "idle", message: "" }) },
    "../../lib/property-marketing": { indiaCalendarDate: () => "2026-01-01" },
    "../../lib/visit-requests": { visitSlots: ["10:00", "11:00"] },
  });
  const html = renderToStaticMarkup(React.createElement(component.default, { propertyId: "property", title: "Test", onClose() {} }));
  for (const name of ["property_id", "date", "time", "name", "mobile", "message"]) assert.ok(html.includes(`name="${name}"`));
  assert.match(html, /role="dialog"/);
  assert.match(html, /grid-cols-2/);
  assert.match(html, /Confirm Visit Request/);
});
