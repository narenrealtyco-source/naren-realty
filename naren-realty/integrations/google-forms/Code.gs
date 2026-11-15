/**
 * NAREN REALTY - Tenant Google Form -> Website integration
 *
 * Install this script in the Google Form RESPONSE SPREADSHEET:
 * Extensions -> Apps Script -> paste this file.
 * Project Settings -> Script Properties:
 *   NAREN_WEBHOOK_SECRET = the same secret configured on Vercel
 * Then Triggers -> Add Trigger:
 *   onFormSubmit | From spreadsheet | On form submit
 */
const NAREN_WEBHOOK_URL = "https://naren-realty-fw7y.vercel.app/api/integrations/google-form";

function onFormSubmit(e) {
  if (!e || !e.range || !e.source) {
    throw new Error("Install an On form submit trigger on the response spreadsheet.");
  }

  const sheet = e.range.getSheet();
  const rowNumber = e.range.getRow();
  const lastColumn = sheet.getLastColumn();
  const headers = sheet.getRange(1, 1, 1, lastColumn).getDisplayValues()[0];
  const row = sheet.getRange(rowNumber, 1, 1, lastColumn).getDisplayValues()[0];
  const normalize = value => String(value || "").toLowerCase().replace(/[^a-z0-9]/g, "");
  const columns = headers.map((header, index) => ({ key: normalize(header), value: String(row[index] || "").trim(), header }));

  // Return the first non-empty value from any matching column. This handles
  // repeated Google Form headings such as Preferred BHK and Preferred Location.
  const get = aliases => {
    const keys = aliases.map(normalize);
    const found = columns.find(column => keys.includes(column.key) && column.value);
    return found ? found.value : "";
  };

  const purposeRaw = get(["Requirement Type"]);
  const purposeText = purposeRaw.toLowerCase();
  const isRental = /rent|rental|tenant|lease/.test(purposeText);
  const isPurchase = /buy|purchase|resale|new flat/.test(purposeText);
  const purpose = isRental ? "Rent" : (isPurchase ? "Buy" : purposeRaw);
  const budgetRaw = isRental
    ? get(["Monthly Rental Budget"])
    : get(["Purchase budget", "Budget"]);
  const budget = parseBudget(budgetRaw);
  const bhk = isRental
    ? get(["Preferred BHK"])
    : get(["Preferred BHK"]);
  const furnishing = isRental
    ? get(["Furnishing Requirement"])
    : get(["Furnishing"]);
  const timeline = isRental
    ? get(["Requirement Timeline"])
    : get(["Requirement Timeline"]);
  const location = get(["Preferred Location"]);
  const contactMethod = get(["Preferred Contact Method"]);
  const consent = get(["Do you agree to be contacted by Naren Realty regarding your rental property requirement and suitable property options, and to pay brokerage equivalent to one month’s rent upon successful completion of the rental transaction and execution of the Rent / Leave & License Agreement?"]);

  if (isRental && !/^(agree|yes|i agree)$/i.test(consent)) {
    console.log("Rental submission skipped: rental brokerage/contact consent not accepted.");
    return;
  }

  const responseId = [e.source.getId(), sheet.getSheetId(), rowNumber].join(":");
  const payload = {
    responseId,
    name: get(["Full Name"]),
    phone: get(["Mobile / WhatsApp Number"]),
    email: get(["Email address"]),
    purpose,
    category: "flat",
    location,
    bhk: parseBhk(bhk),
    minBudget: budget.min,
    maxBudget: budget.max,
    details: [
      furnishing ? "Furnishing: " + furnishing : "",
      timeline ? "Requirement timeline: " + timeline : "",
      contactMethod ? "Preferred contact method: " + contactMethod : "",
      consent ? "Rental consent: " + consent : ""
    ].filter(Boolean).join("\n"),
    raw: Object.fromEntries(columns.map((column, index) => [headers[index] || ("Column " + (index + 1)), row[index]]))
  };

  const secret = PropertiesService.getScriptProperties().getProperty("NAREN_WEBHOOK_SECRET");
  if (!secret) throw new Error("Missing Script Property NAREN_WEBHOOK_SECRET.");

  const response = UrlFetchApp.fetch(NAREN_WEBHOOK_URL, {
    method: "post",
    contentType: "application/json",
    headers: { "x-naren-webhook-secret": secret },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  });
  const status = response.getResponseCode();
  let result = {};
  try { result = JSON.parse(response.getContentText() || "{}"); } catch (_) {}
  if (status < 200 || status >= 300) {
    throw new Error("NAREN REALTY webhook failed (" + status + "): " + (result.error || "Unknown error"));
  }
  if (result.duplicate) return;

  if (payload.email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.email)) {
    const matches = result.matches || [];
    const matchLines = matches.map(property =>
      "- " + property.title +
      (property.locality ? " (" + property.locality + ")" : "") +
      (property.price ? " | ₹" + Number(property.price).toLocaleString("en-IN") : "")
    );
    const subject = matches.length
      ? "NAREN REALTY: Properties matching your requirement"
      : "NAREN REALTY: We received your property requirement";
    const body = [
      "Dear " + payload.name + ",",
      "",
      "Thank you for submitting your property requirement to NAREN REALTY.",
      "Your requirement has been registered successfully.",
      "Reference: " + result.requirementId,
      "",
      matches.length
        ? "We found " + matches.length + " potential matching approved listing(s):"
        : "Our team is checking suitable properties and will contact you when an option is available.",
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

function parseBhk(value) {
  const match = String(value || "").match(/[1-5]/);
  return match ? Number(match[0]) : null;
}

function parseBudget(value) {
  const text = String(value || "").toLowerCase().replace(/,/g, "").trim();
  if (!text) return { min: null, max: null };
  const numbers = text.match(/\d+(?:\.\d+)?/g);
  if (!numbers || !numbers.length) return { min: null, max: null };
  const multiplier = /crore|cr\b/.test(text) ? 10000000 :
    /lakh|lac|l\b/.test(text) ? 100000 : 1;
  const parsed = numbers.map(number => Number(number) * multiplier).filter(Number.isFinite);
  if (!parsed.length) return { min: null, max: null };
  if (parsed.length >= 2) return { min: Math.min(...parsed), max: Math.max(...parsed) };
  // A single selected budget is treated as a maximum budget.
  return { min: null, max: parsed[0] };
}
