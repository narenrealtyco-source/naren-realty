type EventBookingEmailInput = {
  bookingId: string;
  eventName: string;
  organiserName: string;
  organiserEmail: string;
  attendeeName: string;
  attendeeEmail: string;
  attendeePhone?: string | null;
  eventDateTime: string;
  venue: string;
  ticketQuantity: number;
  amountPaid: number;
  paymentReference?: string | null;
  paymentVerified: boolean;
};

type ResendEmail = {
  to: string[];
  subject: string;
  html: string;
  idempotencyKey: string;
};

const FROM = "NAREN REALTY <noreply@narenrealty.co>";

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (char) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[char] ?? char);
}

function money(value: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(value);
}

async function sendEmail(email: ResendEmail) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw new Error("RESEND_API_KEY is not configured.");

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "Idempotency-Key": email.idempotencyKey,
    },
    body: JSON.stringify({
      from: FROM,
      to: email.to,
      subject: email.subject,
      html: email.html,
    }),
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Resend email failed (${response.status}): ${detail.slice(0, 500)}`);
  }
  return response.json() as Promise<{ id: string }>;
}

/**
 * Call this only from a trusted server-side payment webhook, after the gateway
 * signature, order, amount and currency have all been verified.
 *
 * Attendee and organiser messages intentionally do not disclose platform
 * commission or imply that NAREN REALTY is the event's ticket-money recipient.
 * The admin-only message contains the internal commission calculation.
 */
export async function sendEventBookingEmails(input: EventBookingEmailInput) {
  if (!input.paymentVerified) {
    throw new Error("Booking emails can only be sent after verified successful payment.");
  }
  if (!input.bookingId || !input.attendeeEmail || !input.organiserEmail) {
    throw new Error("Booking ID, attendee email and organiser email are required.");
  }
  if (!Number.isInteger(input.ticketQuantity) || input.ticketQuantity < 1) {
    throw new Error("Ticket quantity must be a positive integer.");
  }
  if (!Number.isFinite(input.amountPaid) || input.amountPaid <= 0) {
    throw new Error("Verified payment amount must be greater than zero.");
  }

  const v = {
    bookingId: escapeHtml(input.bookingId),
    eventName: escapeHtml(input.eventName),
    organiserName: escapeHtml(input.organiserName),
    attendeeName: escapeHtml(input.attendeeName),
    attendeePhone: escapeHtml(input.attendeePhone || "Not provided"),
    eventDateTime: escapeHtml(input.eventDateTime),
    venue: escapeHtml(input.venue),
    ticketQuantity: String(input.ticketQuantity),
    amountPaid: money(input.amountPaid),
    paymentReference: escapeHtml(input.paymentReference || "Available in booking records"),
  };

  const shell = (body: string) => `<div style="font-family:Arial,sans-serif;color:#172033;line-height:1.6;max-width:600px;margin:auto"><div style="background:#10243A;color:#fff;padding:20px 24px;font-weight:700">NAREN REALTY</div><div style="padding:24px">${body}<p style="margin-top:28px">Regards,<br><strong>NAREN REALTY Team</strong></p></div></div>`;
  const row = (label: string, value: string) => `<tr><td style="padding:8px 12px;color:#64748b">${label}</td><td style="padding:8px 12px;font-weight:600">${value}</td></tr>`;
  const table = (rows: string) => `<table style="width:100%;border-collapse:collapse;background:#f8fafc">${rows}</table>`;

  const attendeeHtml = shell(`
    <h2>Your event booking is confirmed!</h2>
    <p>Hi ${v.attendeeName}, your payment has been successfully verified and your booking is confirmed.</p>
    ${table(row("Event", v.eventName) + row("Organiser", v.organiserName) + row("Date & time", v.eventDateTime) + row("Venue", v.venue) + row("Booking ID", v.bookingId) + row("Tickets", v.ticketQuantity) + row("Amount paid", v.amountPaid) + row("Payment status", "Successful"))}
    <p>Your booking is for the event organised by <strong>${v.organiserName}</strong>.</p>
    <p>Thank you for booking through NAREN REALTY.</p>
  `);

  const organiserHtml = shell(`
    <h2>New paid booking received</h2>
    <p>Hi ${v.organiserName}, a new booking has been confirmed for your event.</p>
    ${table(row("Event", v.eventName) + row("Booking ID", v.bookingId) + row("Attendee", v.attendeeName) + row("Attendee contact", v.attendeePhone) + row("Tickets booked", v.ticketQuantity) + row("Total booking amount", v.amountPaid) + row("Payment status", "Successful"))}
    <p>Please log in to your organiser dashboard to view the booking details.</p>
  `);

  const tasks = [
    sendEmail({
      to: [input.attendeeEmail],
      subject: `Your Event Booking is Confirmed – ${input.eventName}`,
      html: attendeeHtml,
      idempotencyKey: `event-booking-${input.bookingId}-attendee`,
    }),
    sendEmail({
      to: [input.organiserEmail],
      subject: `New Booking Received – ${input.eventName}`,
      html: organiserHtml,
      idempotencyKey: `event-booking-${input.bookingId}-organiser`,
    }),
  ];

  const adminEmail = process.env.EVENT_ADMIN_EMAIL;
  if (adminEmail) {
    const commission = Math.round(input.amountPaid * 0.1 * 100) / 100;
    const adminHtml = shell(`
      <h2>New event booking – internal notification</h2>
      ${table(row("Event", v.eventName) + row("Organiser", v.organiserName) + row("Booking ID", v.bookingId) + row("Attendee", v.attendeeName) + row("Tickets", v.ticketQuantity) + row("Total payment", v.amountPaid) + row("Platform commission (10%)", money(commission)) + row("Organiser share (90%)", money(input.amountPaid - commission)) + row("Payment reference", v.paymentReference))}
    `);
    tasks.push(sendEmail({
      to: [adminEmail],
      subject: `Internal: New Event Booking – ${input.eventName}`,
      html: adminHtml,
      idempotencyKey: `event-booking-${input.bookingId}-admin`,
    }));
  }

  return Promise.all(tasks);
}
