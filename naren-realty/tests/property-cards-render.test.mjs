import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import * as jsxRuntime from "react/jsx-runtime";
import ts from "typescript";
import * as marketing from "../app/lib/property-marketing.ts";
import * as propertySearch from "../app/lib/property-search.ts";
import * as propertyDefinitions from "../app/lib/properties.ts";

const source = await readFile(new URL("../app/properties/page.tsx", import.meta.url), "utf8");
const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022 } }).outputText;
const fieldsSource = await readFile(new URL("../app/list-property/additional-fields.ts", import.meta.url), "utf8");
const fieldsCode = ts.transpileModule(fieldsSource, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
const propertyFields = {};
vm.runInNewContext(fieldsCode, { exports: propertyFields, require(name) {
  if (name === "../lib/properties") return propertyDefinitions;
  throw new Error(`Unexpected module: ${name}`);
} });
const cardSource = await readFile(new URL("../app/components/PropertyCard.tsx", import.meta.url), "utf8");
const cardCode = ts.transpileModule(cardSource, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022 } }).outputText;
const cardExports = {};
vm.runInNewContext(cardCode, { exports: cardExports, require(name) {
  if (name === "react/jsx-runtime") return jsxRuntime;
  if (name === "react") return { useState: () => [false, () => {}] };
  if (name === "next/link") return { default: ({ href, children, ...props }) => React.createElement("a", { href, ...props }, children) };
  if (name === "next/image") return { default: (props) => React.createElement("img", Object.fromEntries(Object.entries(props).filter(([key]) => key !== "unoptimized" && key !== "fill"))) };
  if (name === "./FavoriteButton") return { default: ({ propertyId }) => React.createElement("button", { "aria-label": `Favourite ${propertyId}` }, "Favourite") };
  if (name === "../properties/[id]/VisitRequestForm") return { default: () => React.createElement("div", null, "Visit form") };
  if (name === "../lib/property-marketing") return { ...marketing, propertyBadge: (listing, peers) => marketing.propertyBadge(listing, peers, new Date("2026-11-13T06:00:00Z")) };
  if (name === "../list-property/additional-fields") return propertyFields;
  throw new Error(`Unexpected module: ${name}`);
} });

function renderPage(listings, locality = "", budget = "", type = "All") {
  const states = [listings, locality, type, budget, "", "", false, true];
  const exports = {};
  vm.runInNewContext(code, {
    exports,
    require(name) {
      if (name === "react/jsx-runtime") return jsxRuntime;
      if (name === "react") return { useEffect() {}, useState: () => [states.shift(), () => {}] };
      if (name === "next/link") return { default: ({ href, children, ...props }) => React.createElement("a", { href, ...props }, children) };
      if (name === "./actions") return {};
      if (name === "../components/PropertyCard") return cardExports;
      if (name === "./visit-actions") return {};
      if (name === "../lib/property-search") return propertySearch;
      throw new Error(`Unexpected module: ${name}`);
    },
  });
  return renderToStaticMarkup(React.createElement(exports.default));
}

function listing(id, overrides = {}) {
  return {
    id, title: `Property ${id}`, status: "Approved", type: "Rental", locality: "Wakad",
    price: 10000, bedrooms: 2, area: 500, furnishing: "", photos: ["https://example.test/photo.png"],
    description: "", bathrooms: 1,
    publicListingDetails: { version: 1, values: { Rental_deposit: "10000" }, amenities: {}, facilities: [] }, ...overrides,
  };
}

function renderCard(item, listings = [item]) {
  return renderToStaticMarkup(React.createElement(cardExports.default, { listing: item, listings, visitsReady: true }));
}

test("approved property cards render saved-data badges and public actions without contact controls", () => {
  const listings = [
    listing("1", { availabilityConfirmation: "immediate" }),
    listing("2", { type: "PG" }),
    listing("3", { type: "Resale" }),
    listing("4", { type: "Airbnb" }),
  ];
  const html = renderPage(listings);
  assert.equal((html.match(/Available Now/g) ?? []).length, 1);
  assert.doesNotMatch(html, />Contact</);
  assert.doesNotMatch(html, /Contact number is not configured/);
  assert.equal((html.match(/>Schedule a Visit</g) ?? []).length, 2);
  assert.equal((html.match(/>Book a Visit</g) ?? []).length, 1);
  assert.equal((html.match(/>Check Availability</g) ?? []).length, 1);
  assert.equal((html.match(/>View Details</g) ?? []).length, 4);
  assert.match(html, /href="\/properties\/1"/);
  assert.match(html, /flex-row/);
  assert.match(html, /w-\[35%\]/);
  assert.match(html, /sm:w-\[39%\]/);
  assert.match(html, /grid-cols-2/);
});

test("the shared card shows saved rental and resale facts without mixing categories", () => {
  const rental = listing("rental", {
    publicListingDetails: {
      version: 1,
      values: {
        common_built_up_area: "1100", Rental_bhk: "2 BHK", Rental_furnishing: "Fully Furnished",
        Rental_deposit: "25000", Rental_tenant_preference: "Family", Rental_negotiable: "Yes",
      },
      amenities: { Rental: [] }, facilities: [],
    },
  });
  const rentalHtml = renderCard(rental);
  for (const text of ["Monthly Rent", "₹10,000", "Built-up Area", "1,100 sq. ft.", "Carpet Area", "500 sq. ft.", "2 BHK", "Fully Furnished", "Preferred Tenants", "Family", "Negotiable", "View Details"]) {
    assert.ok(rentalHtml.includes(text), text);
  }
  assert.equal((rentalHtml.match(/Fully Furnished/g) ?? []).length, 1);
  assert.doesNotMatch(rentalHtml, /Sharing Type|Guest Capacity|Sale Price/);

  const resale = listing("resale", {
    type: "Resale",
    price: 9500000,
    publicListingDetails: {
      version: 1,
      values: {
        common_property_type: "Apartment / Flat", Resale_bhk: "3 BHK", Resale_furnishing: "Semi-Furnished",
        Resale_negotiable: "Yes", Resale_possession: "Ready to Move",
      },
      amenities: { Resale: [] }, facilities: [],
    },
  });
  const resaleHtml = renderCard(resale);
  for (const text of ["Sale Price", "₹95,00,000", "3 BHK", "Semi-Furnished", "Apartment / Flat", "Ready to Move", "Negotiable"]) {
    assert.ok(resaleHtml.includes(text), text);
  }
  assert.doesNotMatch(resaleHtml, /Monthly Rent|Security Deposit|Preferred Tenants/);
});

test("the shared card shows PG sharing data and only recorded facilities", () => {
  const pg = listing("pg", {
    type: "PG",
    publicListingDetails: {
      version: 1,
      values: {
        PG_sharing_0_rent: "9000", PG_sharing_0_deposit: "5000", PG_sharing_0_units: "2",
        PG_gender: "Boys", PG_suitable: "Working Professionals",
      },
      amenities: { PG: ["Food / Mess", "Air Conditioning", "Wi-Fi"] },
      facilities: ["Food Included", "AC Available"],
    },
  });
  const html = renderCard(pg);
  for (const text of ["Rent per person / month", "₹9,000", "Single Sharing (1 Person)", "₹5,000", "2 available", "Food", "Included", "Boys", "AC", "Book a Visit"]) {
    assert.ok(html.includes(text), text);
  }
  assert.doesNotMatch(html, /Sale Price|Preferred Tenants|Guest Capacity/);
  assert.equal((html.match(/class="property-highlight/g) ?? []).length, 2);
});

test("the shared card shows Airbnb stay facts and keeps the existing availability action", () => {
  const airbnb = listing("short-stay", {
    type: "Airbnb",
    price: 4500,
    publicListingDetails: {
      version: 1,
      values: {
        Airbnb_stay_type: "Entire Apartment", Airbnb_guests: "4", Airbnb_bedrooms: "2",
        Airbnb_bathrooms: "1", Airbnb_minimum_stay: "2",
      },
      amenities: { Airbnb: ["Kitchen", "Swimming Pool", "Workspace"] },
      facilities: [],
    },
  });
  const html = renderCard(airbnb);
  for (const text of ["Price per night", "₹4,500", "Entire Apartment", "Guest Capacity", "Bedrooms", "Bathrooms", "Minimum Stay", "2 nights", "Kitchen", "Check Availability"]) {
    assert.ok(html.includes(text), text);
  }
  assert.doesNotMatch(html, /Monthly Rent|Preferred Tenants|Sharing Type/);
  assert.equal((html.match(/class="property-highlight/g) ?? []).length, 3);
  assert.doesNotMatch(html, />Entire Property</);
});

test("badge comparisons use all approved results, not just the visible search results", () => {
  const target = listing("1", { locality: "Wakad", price: 9000 });
  const peers = [listing("2"), listing("3"), listing("4")];
  const html = renderPage([target, ...peers], "wakad", "9500");
  assert.match(html, /Budget Friendly/);
  assert.equal((html.match(/Budget Friendly/g) ?? []).length, 1);
  assert.doesNotMatch(html, /Property 2/);
});

test("category filters show only the selected real listings and keep photos and details linked", () => {
  const all = [listing("1"), listing("2", { type: "Resale" }), listing("3", { type: "PG" }), listing("4", { type: "Airbnb" })];
  for (const [type, id] of [["Rental", "1"], ["Resale", "2"], ["PG", "3"], ["Airbnb", "4"]]) {
    const html = renderPage(all, "", "", type);
    assert.match(html, new RegExp(`Property ${id}`));
    assert.equal((html.match(/<article/g) ?? []).length, 1);
    assert.match(html, new RegExp(`href="/properties/${id}"`));
    assert.match(html, /src="https:\/\/example.test\/photo.png"/);
  }
  assert.equal((renderPage(all).match(/<article/g) ?? []).length, 4);
  assert.match(source, /className="mt-4 grid gap-5 md:grid-cols-2"/);
});

test("empty approved result shows the requested empty state", () => {
  assert.match(renderPage([]), /No properties available right now\. Check back soon\./);
});

test("saved landmarks are searchable without exposing unrelated private fields", () => {
  const target = listing("1", { publicListingDetails: { values: { common_landmark: "City Park" } } });
  assert.match(renderPage([target, listing("2")], "city park"), /Property 1/);
  assert.doesNotMatch(renderPage([target, listing("2")], "city park"), /Property 2/);
  assert.equal(propertySearch.matchesPropertyLocation(target, "  PARK "), true);
});
