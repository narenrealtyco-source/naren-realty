/**
 * NAREN REALTY - Google Forms tenant requirement bridge
 * Install an installable "On form submit" trigger on the response spreadsheet.
 *
 * Setup:
 * 1) Open the Google Form response spreadsheet -> Extensions -> Apps Script.
 * 2) Paste this file.
 * 3) In Project Settings -> Script properties, add NAREN_WEBHOOK_SECRET.
 * 4) Create trigger: onFormSubmit -> From spreadsheet -> On form submit.
 * 5) Ensure the form collects email and the header names match one of the aliases below.
 */
const NAREN_WEBHOOK_URL = "https://naren-realty-fw7y.vercel.app/api/integrations/google-form";

function onFormSubmit(e) {
  if (!e || !e.namedValues || !e.range) throw new Error("Install this as a spreadsheet form-submit trigger.");
  const values = e.namedValues;
  const get = (aliases) => {
    const wanted = aliases.map(normalizeHeader);
    const key = Object.keys(values).find((header) => wanted.includes(normalizeHeader(header)));
    return key ? String((values[key] || [""])[0] || "").trim() : "";
  };
  const row = e.range.getRow();
  const sheet = e.range.getSheet();
  const spreadsheetId = e.source.getId();
  const responseId = [spreadsheetId, sheet.getSheetId(), row].join(":");

  const payload = {
    responseId,
    name: get(["Name", "Full Name", "Tenant Name", "Customer Name", "Your Name"]),
    phone: get(["Mobile", "Mobile Number", "Phone", "Phone Number", "Contact Number", "WhatsApp Number"]),
    email: get(["Email", "Email Address", "E-mail", "Your Email"]),
    purpose: get(["Requirement Type", "Purpose", "Looking For", "I Want To", "Property Requirement"]),
    category: get(["Property Type", "Category", "Property Category", "Type"]),
    location: get(["Preferred Location", "Location", "Preferred Area", "Area", "Locality", "Preferred Locality"]),
    bhk: get(["BHK", "Configuration", "Bedroom", "Bedrooms"]),
    minBudget: get(["Minimum Budget", "Min Budget", "Budget From"]),
    maxBudget: get(["Maximum Budget", "Max Budget", "Budget", "Monthly Budget", "Expected Budget"]),
    moveInDate: get(["Move In Date", "Possession Date", "Required From"]),
    details: get(["Additional Requirements", "Other Requirements", "Remarks", "Message"]),
    raw: values
  };

  const secret = PropertiesService.getScriptProperties().getProperty("NAREN_WEBHOOK_SECRET");
  if (!secret) throw new Error("Set Script Property NAREN_WEBHOOK_SECRET before enabling the trigger.");

  const response = UrlFetchApp.fetch(NAREN_WEBHOOK_URL, {
    method: "post",
    contentType: "application/json",
    headers: { "x-naren-webhook-secret": secret },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  });
  const status = response.getResponseCode();
  const result = JSON.parse(response.getContentText() || "{}");
  if (status < 200 || status >= 300) throw new Error("NAREN REALTY webhook failed (" + status + "): " + (result.error || "Unknown error"));
  if (result.duplicate) return;

  if (payload.email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.email)) {
    const matchLines = (result.matches || []).map((p) =>
      "- " + p.title + (p.locality ? " (" + p.locality + ")" : "") +
      (p.price ? " | ₹" + Number(p.price).toLocaleString("en-IN") : "")
    );
    const subject = result.matchCount > 0
      ? "NAREN REALTY: Properties matching your requirement"
      : "NAREN REALTY: We received your property requirement";
    const body = [
      "Dear " + payload.name + ",",
      "",
      "Thank you for submitting your property requirement to NAREN REALTY.",
      "Your requirement has been registered successfully.",
      "Requirement reference: " + result.requirementId,
      "",
      result.matchCount > 0
        ? "We found " + result.matchCount + " potential matching listing(s):"
        : "We are checking our approved property inventory. Our team will contact you when a suitable property is available.",
      "",
      matchLines.join("\n"),
      "",
      "Our team will verify availability and details before arranging a visit.",
      "",
      "Regards,",
      "NAREN REALTY"
    ].join("\n");
    GmailApp.sendEmail(payload.email, subject, body, { name: "NAREN REALTY" });
  }
}

function normalizeHeader(value) {
  return String(value || "").toLowerCase().replace(/[^a-z0-9]/g, "");
}
