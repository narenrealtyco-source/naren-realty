import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import * as jsxRuntime from "react/jsx-runtime";
import ts from "typescript";

const source = await readFile(new URL("../app/home-services/ServicesDirectory.tsx", import.meta.url), "utf8");
const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText;
const exports = {};
vm.runInNewContext(code, { exports, require(name) {
  if (name === "react/jsx-runtime") return jsxRuntime;
  if (name === "next/link") return { default: ({ href, children, ...props }) => React.createElement("a", { href, ...props }, children) };
  throw new Error(`Unexpected dependency ${name}`);
} });
const categories = [{ id: "1", name: "Electrician", slug: "electrician", active: true }, { id: "2", name: "Painting", slug: "painting", active: true }];
test("category sidebar highlights selected category and renders distinct public profile fields", () => {
  const html = renderToStaticMarkup(React.createElement(exports.default, { categories, selected: categories[1], providers: [{ id: "id", category_id: "2", public_name: "Public Provider", business_name: "Business", services: "Wall painting", description: "Interior work", locality: "Wakad", city: "Pune" }], hasMore: false }));
  for (const text of ["Electrician", "Painting", "Public Provider", "Business", "Wall painting", "Pune", "Wakad", "Send Enquiry"]) assert.ok(html.includes(text));
  assert.match(html, /aria-current="page"/);
  assert.match(html, /href="\/home-services\?category=2"/);
  assert.match(html, /href="\/home-services\/vendors\/id"/);
  assert.doesNotMatch(html, /mobile|commission_terms|contact_person/);
});
test("empty categories render honest empty state", () => {
  const html = renderToStaticMarkup(React.createElement(exports.default, { categories, selected: categories[0], providers: [], hasMore: false }));
  assert.match(html, /No approved providers are available/);
  assert.doesNotMatch(html, /Send Enquiry/);
});
test("selecting a category queries its active providers", async () => {
  const pageSource = await readFile(new URL("../app/home-services/page.tsx", import.meta.url), "utf8");
  const pageCode = ts.transpileModule(pageSource, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  const pageExports = {};
  const queries = [];
  const vendor = { id: "v1", category_id: "2", public_name: "Provider", business_name: "Business", services: "Painting", description: "Interior", locality: "Wakad", city: "Pune" };
  vm.runInNewContext(pageCode, { exports: pageExports, console, require(name) {
    if (name === "react/jsx-runtime") return jsxRuntime;
    if (name === "react") return React;
    if (name === "next/link") return { default: () => null };
    if (name === "../lib/vendor-marketplace") return { vendorMarketplaceReady: () => true };
    if (name === "./ServicesDirectory") return { default: () => null };
    if (name === "../lib/supabase-server") return { createSupabaseServerClient: async () => ({
      from(table) {
        const query = { table, filters: [] }; queries.push(query);
        const builder = {
          select() { return this; },
          eq(field, value) { query.filters.push([field, value]); return this; },
          neq() { return this; },
          not() { return this; },
          order() { return this; },
          limit() { return this; },
          then(resolve) { return Promise.resolve({ data: table === "service_categories" ? categories : [vendor], error: null }).then(resolve); },
        };
        return builder;
      },
    }) };
    throw new Error(`Unexpected dependency ${name}`);
  } });
  const page = pageExports.default({ searchParams: Promise.resolve({ category: "2" }) });
  const content = page.props.children.props.children[2].props.children;
  const directory = await content.type(content.props);
  assert.equal(directory.props.selected.id, "2");
  assert.equal(directory.props.providers[0].id, "v1");
  assert.deepEqual(queries[1].filters, [["active", true], ["category_id", "2"]]);
});
test("proposal includes requested categories, private followup and server-derived category", async () => {
  const sql = await readFile(new URL("../supabase/migrations/0018_vendor_marketplace_proposal.sql", import.meta.url), "utf8");
  for (const name of ["Electrician", "Key Maker / Locksmith", "Modular Kitchen", "Painting", "Plumber", "Carpenter & Furniture", "Home Cleaning", "AC Repair & Service", "Appliance Repair", "Civil Work", "Waterproofing", "Pest Control", "Packers & Movers", "Interior Designer", "Home Loan Assistance", "Legal Services", "Home Renovation", "Other Home Services"]) assert.ok(sql.includes(`'${name}'`));
  assert.doesNotMatch(sql, /'New Builder Projects'/);
  assert.match(sql, /before insert on public\.vendor_enquiries/i);
  assert.match(sql, /Admins read vendor enquiry followups/);
  assert.match(sql, /public\.is_admin\(\) is not true/);
});
