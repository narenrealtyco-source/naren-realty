import assert from "node:assert/strict";
import test from "node:test";
import { propertyActionLabel, propertyBadge } from "../app/lib/property-marketing.ts";

const now = new Date("2026-11-13T06:00:00Z");
function listing(id, overrides = {}) {
  return {
    id, status: "Approved", type: "Rental", locality: "Wakad", price: 10000,
    publicListingDetails: { values: { Rental_deposit: "10000" } }, ...overrides,
  };
}
const peers = [listing("a"), listing("b"), listing("c")];
const badge = (value, comparisons = peers) => propertyBadge(value, comparisons, now);

test("category actions open visits or availability enquiry", () => {
  assert.equal(propertyActionLabel("Rental"), "Schedule a Visit");
  assert.equal(propertyActionLabel("Resale"), "Schedule a Visit");
  assert.equal(propertyActionLabel("PG"), "Book a Visit");
  assert.equal(propertyActionLabel("Airbnb"), "Check Availability");
});

test("verified availability is prioritized, within seven days only, and past dates expire", () => {
  assert.equal(badge(listing("x", { availabilityConfirmation: "immediate", price: 1000 })), "Available Now");
  assert.equal(badge(listing("x", { availabilityConfirmation: "immediate", availableFrom: "2026-11-20" })), undefined);
  assert.equal(badge(listing("x", { availabilityConfirmation: "immediate", availableFrom: "2026-11-12" })), "Available Now");
  assert.equal(badge(listing("x", { availabilityConfirmation: "date", availableFrom: "2026-11-20" })), "Quick Move-in");
  assert.equal(badge(listing("x", { availabilityConfirmation: "date", availableFrom: "2026-11-21" })), undefined);
  assert.equal(badge(listing("x", { availabilityConfirmation: "date", availableFrom: "2026-11-12" })), undefined);
  assert.equal(badge(listing("x", { availableFrom: "2026-11-13" })), undefined);
  assert.equal(badge(listing("x", { status: "Rejected", availabilityConfirmation: "immediate" })), undefined);
});

test("medians use three other approved same-locality rental listings and exact thresholds", () => {
  assert.equal(badge(listing("x", { publicListingDetails: { values: { Rental_deposit: "8000" } }, price: 9000 })), "Low Deposit");
  assert.equal(badge(listing("x", { publicListingDetails: { values: { Rental_deposit: "8001" } }, price: 9000 })), "Budget Friendly");
  assert.equal(badge(listing("x", { price: 9001 })), undefined);
  assert.equal(badge(listing("x", { price: 1000 }), peers.slice(0, 2)), undefined);
  assert.equal(badge(listing("x", { price: 1000 }), [peers[0], peers[1], listing("d", { status: "Rejected" })]), undefined);
  assert.equal(badge(listing("x", { price: 1000 }), [peers[0], peers[1], listing("d", { locality: "Baner" })]), undefined);
  assert.equal(badge(listing("a", { price: 1000 }), peers), undefined);
});

test("missing and zero medians, mixed categories and non-comparable prices never invent badges", () => {
  const missing = peers.map((p) => ({ ...p, publicListingDetails: { values: {} }, price: 0 }));
  assert.equal(badge(listing("x", { publicListingDetails: { values: { Rental_deposit: "0" } }, price: 1 }), missing), undefined);
  assert.equal(badge(listing("x", { type: "PG", price: 1 }), peers), undefined);
  assert.equal(badge(listing("x", { type: "PG", price: 9000 }), peers.map((p) => ({ ...p, type: "PG" }))), "Budget Friendly");
  assert.equal(badge(listing("x", { type: "Resale", price: 1 }), peers), undefined);
  assert.equal(badge(listing("x", { type: "Airbnb", price: 1 }), peers), undefined);
  const stays = peers.map((p) => ({ ...p, type: "Airbnb", publicListingDetails: { values: { Airbnb_deposit: "10000" } } }));
  assert.equal(badge(listing("x", { type: "Airbnb", publicListingDetails: { values: { Airbnb_deposit: "8000" } } }), stays), "Low Deposit");
});
