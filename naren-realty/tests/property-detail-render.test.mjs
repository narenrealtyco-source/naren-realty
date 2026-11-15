import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import * as jsxRuntime from "react/jsx-runtime";
import ts from "typescript";
import * as propertyDefinitions from "../app/lib/properties.ts";

async function load(path, modules, hooks = {}) {
  const source = await readFile(new URL(path, import.meta.url), "utf8");
  const code = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const exports = {};
  vm.runInNewContext(code, {
    exports,
    require(name) {
      if (name === "react/jsx-runtime") return jsxRuntime;
      if (name === "react") return {
        useEffect() {},
        useRef() { return { current: null }; },
        useCallback(callback) { return callback; },
        useState(initial) { return [typeof initial === "function" ? initial() : initial, () => {}]; },
        ...hooks,
      };
      assert.ok(Object.hasOwn(modules, name), `unexpected module ${name}`);
      return modules[name];
    },
  });
  return exports;
}

const fields = await load("../app/list-property/additional-fields.ts", {
  "../lib/properties": propertyDefinitions,
});
const gallery = await load("../app/properties/[id]/PropertyPhotoGallery.tsx", {
  "next/image": { __esModule: true, default: (props) => React.createElement("img", Object.fromEntries(Object.entries(props).filter(([key]) => key !== "unoptimized"))) },
});
let stateValues = [];
const detail = await load("../app/properties/[id]/PropertyDetailClient.tsx", {
  "next/link": { __esModule: true, default: ({ href, children, ...props }) => React.createElement("a", { href, ...props }, children) },
  "../../components/ContactButton": { __esModule: true, default: ({ label = "Contact" } = {}) => React.createElement("button", null, label) },
  "../../components/EnquiryModal": { __esModule: true, default: () => null },
  "./VisitRequestForm": { __esModule: true, default: () => null },
  "../../components/FavoriteButton": { __esModule: true, default: () => React.createElement("button", { "aria-label": "Add to favourites" }, "Favourite") },
  "./PropertyPhotoGallery": gallery,
  "../actions": {},
  "../visit-actions": {},
  "../../lib/property-marketing": { indiaCalendarDate: () => "2026-01-01" },
  "../../list-property/additional-fields": fields,
}, {
  useState() {
    assert.ok(stateValues.length, "unexpected property detail state");
    return [stateValues.shift(), () => {}];
  },
});

function listing(id, overrides = {}) {
  return {
    id, ownerId: "owner", ownerName: "", ownerEmail: "", ownerMobile: "",
    title: `Property ${id}`, type: "Rental", locality: "Wakad", address: "Main Road, Wakad",
    price: 30000, area: 900, bedrooms: 2, bathrooms: 2, furnishing: "",
    description: "Bright apartment close to the park.", photos: [],
    status: "Approved", createdAt: "", updatedAt: "",
    publicListingDetails: { version: 1, values: {}, amenities: {}, facilities: [] },
    ...overrides,
  };
}

function renderProperty(property) {
  stateValues = [property, 0, `${property.id}:0`, null, false, false, true, ""];
  return renderToStaticMarkup(React.createElement(detail.default, { listingId: property.id }));
}

test("rental detail shows actual photos, distinct carpet and built-up areas, rental terms, selected amenities and actions", () => {
  const property = listing("rental-1", {
    photos: [
      "https://photos.example.test/1.jpg", "https://photos.example.test/2.jpg",
      "https://photos.example.test/3.jpg", "https://photos.example.test/4.jpg",
      "https://photos.example.test/5.jpg",
    ],
    publicListingDetails: {
      version: 1,
      values: {
        common_property_type: "Apartment / Flat",
        common_built_up_area: "1100",
        Rental_bhk: "2 BHK",
        Rental_bedrooms: "2",
        Rental_bathrooms: "2",
        Rental_balconies: "2",
        Rental_floor: "4",
        Rental_total_floors: "12",
        Rental_deposit: "50000",
        Rental_negotiable: "Yes",
        Rental_maintenance_included: "No",
        common_available_from: "2026-03-01",
      },
      amenities: { Rental: ["Lift", "Covered Parking"] },
      facilities: [],
    },
  });
  const html = renderProperty(property);
  for (const text of [
    "For Rent", "Property rental-1", "Property Overview", "2 BHK", "Built-up Area", "1,100 sq. ft.",
    "Carpet Area", "900 sq. ft.", "Rental Terms", "Monthly Rent", "₹30,000", "₹50,000",
    "Rent Negotiable", "Maintenance Included", "Available From", "Lift", "Covered Parking",
    "View All Photos", "Book Visit", "Enquire Now", "Contact NAREN REALTY",
  ]) assert.ok(html.includes(text), text);
  assert.doesNotMatch(html, /Gymnasium|undefined|null/);
  assert.match(html, /src="https:\/\/photos\.example\.test\/1\.jpg"/);
  assert.match(html, /src="https:\/\/photos\.example\.test\/5\.jpg"/);
  assert.match(html, /href="\/properties"/);
});

test("resale detail uses the actual sale price and omits rental-only content", () => {
  const property = listing("resale-1", {
    type: "Resale",
    price: 9500000,
    publicListingDetails: {
      version: 1,
      values: { Resale_bhk: "3 BHK", Resale_negotiable: "Yes", Resale_ownership: "Freehold" },
      amenities: { Resale: ["Security"] },
      facilities: [],
    },
  });
  const html = renderProperty(property);
  assert.match(html, /For Sale/);
  assert.match(html, /₹95,00,000/);
  assert.match(html, /Price negotiable/);
  assert.match(html, /Freehold/);
  assert.match(html, /Security/);
  assert.doesNotMatch(html, /Rental Terms|Monthly Rent|Security Deposit/);
});
