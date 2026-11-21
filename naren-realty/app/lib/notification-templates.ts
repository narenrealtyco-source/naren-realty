/**
 * NAREN REALTY notification copy.
 *
 * Brand voice: balanced, premium + friendly, English.
 * These are copy templates only. Event handlers should call
 * renderNotificationTemplate() and persist/send the returned title/body.
 */

export type NotificationRole =
  | "customer"
  | "owner"
  | "manager"
  | "admin"
  | "broker"
  | "vendor";

export type NotificationTemplateKey =
  | "welcome_customer"
  | "welcome_owner"
  | "requirement_received"
  | "matches_found"
  | "no_matches_yet"
  | "visit_requested"
  | "visit_confirmed"
  | "visit_reminder"
  | "visit_rescheduled"
  | "visit_cancelled"
  | "loan_received"
  | "loan_updated"
  | "property_submitted"
  | "property_approved"
  | "property_changes_required"
  | "property_unpublished"
  | "owner_new_enquiry"
  | "owner_visit_requested"
  | "manager_visit_assigned"
  | "manager_visit_reminder"
  | "manager_visit_updated"
  | "manager_response_pending"
  | "manager_response_saved"
  | "admin_new_customer"
  | "admin_new_owner"
  | "admin_property_pending"
  | "admin_new_requirement"
  | "admin_new_enquiry"
  | "admin_visit_needs_assignment"
  | "admin_new_referral"
  | "referral_submitted"
  | "referral_under_review"
  | "referral_reward_eligible"
  | "referral_reward_paid"
  | "profile_updated"
  | "password_changed"
  | "new_login_detected"
  | "support_received"
  | "broker_lead_assigned"
  | "broker_listing_enquiry"
  | "vendor_service_enquiry"
  | "vendor_booking_confirmed";

export type NotificationTemplate = {
  title: string;
  body: string;
  actionLabel?: string;
};

type NotificationValues = Record<string, string | number | undefined>;

const templates: Record<NotificationTemplateKey, NotificationTemplate> = {
  welcome_customer: {
    title: "You're Home! 🏡",
    body: "Welcome to NAREN REALTY. Your next address could be just a few clicks away.",
    actionLabel: "Explore Properties",
  },
  welcome_owner: {
    title: "Welcome to the NAREN REALTY Family! 👋",
    body: "Your property journey starts here. Add your listing and let the right people find it.",
    actionLabel: "Add Property",
  },
  requirement_received: {
    title: "Your Property Hunt Starts Here! 🔍",
    body: "We've got your requirement. Our team is on the lookout for options that fit your needs.",
    actionLabel: "View Requirement",
  },
  matches_found: {
    title: "Your Matches Are In! 🎯",
    body: "We found {{count}} properties that match your preferences. Your next move could be right here.",
    actionLabel: "View Matches",
  },
  no_matches_yet: {
    title: "The Search Is Still On 🔎",
    body: "No exact match just yet. Your requirement is active, and we'll let you know when a suitable property comes up.",
    actionLabel: "View Requirement",
  },
  visit_requested: {
    title: "Visit Request Received! 📍",
    body: "We've received your request to visit {{propertyName}}. Our team will coordinate the details with you.",
    actionLabel: "View Visit",
  },
  visit_confirmed: {
    title: "It's a Date! 📅",
    body: "Your visit to {{propertyName}} is confirmed for {{date}} at {{time}}.",
    actionLabel: "View Visit",
  },
  visit_reminder: {
    title: "Your Property Visit Is Coming Up ⏰",
    body: "A quick reminder: your visit to {{propertyName}} is scheduled for {{date}} at {{time}}.",
    actionLabel: "View Visit",
  },
  visit_rescheduled: {
    title: "Plans Have Changed 🔄",
    body: "Your visit to {{propertyName}} has been moved to {{date}} at {{time}}.",
    actionLabel: "View Updated Visit",
  },
  visit_cancelled: {
    title: "Your Visit Has Been Cancelled",
    body: "The scheduled visit to {{propertyName}} has been cancelled. Contact our team if you'd like to arrange another time.",
    actionLabel: "Contact Team",
  },
  loan_received: {
    title: "Let's Get Your Loan Journey Started 💼",
    body: "We've received your loan enquiry. Our team will review your requirement and reach out about the next steps.",
    actionLabel: "View Loan Request",
  },
  loan_updated: {
    title: "There's an Update on Your Loan Enquiry",
    body: "Your loan enquiry status is now: {{status}}. Open your request to see the latest details.",
    actionLabel: "View Loan Request",
  },
  property_submitted: {
    title: "Your Property Is in the Queue! 🏡",
    body: "We've received {{propertyName}}. Our team will review the details before it goes live.",
    actionLabel: "View Property",
  },
  property_approved: {
    title: "Your Property Is Ready for the Spotlight! ✨",
    body: "{{propertyName}} has been approved and is ready to be published.",
    actionLabel: "View Property",
  },
  property_changes_required: {
    title: "A Quick Update Needed 🛠️",
    body: "{{propertyName}} needs a few changes before it can be approved. Check the review notes for details.",
    actionLabel: "Review Property",
  },
  property_unpublished: {
    title: "Your Listing Is Paused ⏸️",
    body: "{{propertyName}} is currently hidden from public search. Contact our team if you need help.",
    actionLabel: "View Property",
  },
  owner_new_enquiry: {
    title: "Someone's Interested in Your Property! 👀",
    body: "A new enquiry has arrived for {{propertyName}}. Our team will coordinate the next steps.",
    actionLabel: "View Enquiry",
  },
  owner_visit_requested: {
    title: "A Potential Visitor Is on the Way! 📍",
    body: "A customer has requested a visit to {{propertyName}}. We'll coordinate the schedule with you.",
    actionLabel: "View Visit",
  },
  manager_visit_assigned: {
    title: "A New Visit Is Waiting for You 📍",
    body: "{{propertyName}} has been assigned to you for {{date}} at {{time}}. Please review and respond.",
    actionLabel: "Review Assignment",
  },
  manager_visit_reminder: {
    title: "You're Up Next! 🚗",
    body: "Your visit to {{propertyName}} is scheduled for {{date}} at {{time}}. Please coordinate with the customer.",
    actionLabel: "View Visit",
  },
  manager_visit_updated: {
    title: "Visit Details Updated 🔄",
    body: "The schedule for {{propertyName}} has changed to {{date}} at {{time}}.",
    actionLabel: "View Updated Visit",
  },
  manager_response_pending: {
    title: "Quick Action Needed ⚡",
    body: "The visit assignment for {{propertyName}} is waiting for your response.",
    actionLabel: "Respond Now",
  },
  manager_response_saved: {
    title: "Response Saved! ✅",
    body: "Your response for the {{propertyName}} visit has been submitted.",
    actionLabel: "View Visit",
  },
  admin_new_customer: {
    title: "A New Face at NAREN REALTY! 👋",
    body: "{{customerName}} just created a customer account.",
    actionLabel: "View Customer",
  },
  admin_new_owner: {
    title: "A New Property Owner Joined! 🏡",
    body: "{{ownerName}} has registered on the platform.",
    actionLabel: "View Owner",
  },
  admin_property_pending: {
    title: "Fresh Listing Needs Your Review ✨",
    body: "{{propertyName}} was submitted by {{ownerName}} and is waiting for approval.",
    actionLabel: "Review Listing",
  },
  admin_new_requirement: {
    title: "A New Requirement Just Landed! 🎯",
    body: "{{customerName}} is looking to {{requirementType}}. Review the requirement and check for matches.",
    actionLabel: "View Requirement",
  },
  admin_new_enquiry: {
    title: "Lead Alert! A New Enquiry Is In 🔔",
    body: "A customer has enquired about {{propertyName}}. Time for a follow-up.",
    actionLabel: "View Enquiry",
  },
  admin_visit_needs_assignment: {
    title: "Your Team Needs You ⚡",
    body: "A site visit for {{propertyName}} is waiting for a manager to be assigned.",
    actionLabel: "Assign Manager",
  },
  admin_new_referral: {
    title: "A Referral Just Came In! 🎁",
    body: "{{referrerName}} has submitted a new referral. Review it when you're ready.",
    actionLabel: "View Referral",
  },
  referral_submitted: {
    title: "Good Things Start with a Referral! 🎁",
    body: "Your referral has been submitted successfully. We'll keep you posted as it progresses.",
    actionLabel: "View Referral",
  },
  referral_under_review: {
    title: "Your Referral Is on the Move 🚀",
    body: "We've started reviewing your referral. We'll notify you when its status changes.",
    actionLabel: "Track Referral",
  },
  referral_reward_eligible: {
    title: "You've Earned a Reward! 🥳",
    body: "Your referral is now eligible for a reward of {{amount}}. Our team will process it after verification.",
    actionLabel: "View Reward",
  },
  referral_reward_paid: {
    title: "Reward Unlocked! 🎉",
    body: "Your referral reward of {{amount}} has been marked as paid. Thanks for spreading the word!",
    actionLabel: "View Referral",
  },
  profile_updated: {
    title: "All Set! ✅",
    body: "Your NAREN REALTY profile has been updated successfully.",
    actionLabel: "View Profile",
  },
  password_changed: {
    title: "Password Updated 🔐",
    body: "Your account password was changed successfully. If this wasn't you, contact our support team immediately.",
    actionLabel: "Account Security",
  },
  new_login_detected: {
    title: "A New Login Was Detected 🔐",
    body: "Your NAREN REALTY account was accessed from a new session. If this wasn't you, secure your account.",
    actionLabel: "Account Security",
  },
  support_received: {
    title: "We've Got Your Message 💬",
    body: "Your support request has reached our team. We'll get back to you as soon as we can.",
    actionLabel: "View Support Request",
  },
  broker_lead_assigned: {
    title: "A Fresh Lead Is Yours! 🎯",
    body: "A new lead has been assigned to you by NAREN REALTY Admin. Open it to review the details.",
    actionLabel: "View Lead",
  },
  broker_listing_enquiry: {
    title: "Interest Is Building! 👀",
    body: "A customer has enquired about your listing {{propertyName}}.",
    actionLabel: "View Enquiry",
  },
  vendor_service_enquiry: {
    title: "A New Service Request Is In 🛠️",
    body: "A customer is looking for {{serviceName}}. Review the request and respond.",
    actionLabel: "View Request",
  },
  vendor_booking_confirmed: {
    title: "You're Booked! ✅",
    body: "Your {{serviceName}} booking is confirmed for {{date}} at {{time}}.",
    actionLabel: "View Booking",
  },
};

const allowedRoles: Record<NotificationTemplateKey, NotificationRole[]> = {
  welcome_customer: ["customer"],
  welcome_owner: ["owner"],
  requirement_received: ["customer"],
  matches_found: ["customer"],
  no_matches_yet: ["customer"],
  visit_requested: ["customer"],
  visit_confirmed: ["customer", "owner", "manager"],
  visit_reminder: ["customer"],
  visit_rescheduled: ["customer", "owner", "manager"],
  visit_cancelled: ["customer", "owner", "manager"],
  loan_received: ["customer"],
  loan_updated: ["customer", "admin"],
  property_submitted: ["owner", "admin"],
  property_approved: ["owner"],
  property_changes_required: ["owner"],
  property_unpublished: ["owner"],
  owner_new_enquiry: ["owner"],
  owner_visit_requested: ["owner"],
  manager_visit_assigned: ["manager", "admin"],
  manager_visit_reminder: ["manager"],
  manager_visit_updated: ["manager", "customer", "owner"],
  manager_response_pending: ["manager", "admin"],
  manager_response_saved: ["manager", "admin"],
  admin_new_customer: ["admin"],
  admin_new_owner: ["admin"],
  admin_property_pending: ["admin"],
  admin_new_requirement: ["admin"],
  admin_new_enquiry: ["admin"],
  admin_visit_needs_assignment: ["admin"],
  admin_new_referral: ["admin"],
  referral_submitted: ["customer", "owner"],
  referral_under_review: ["customer", "owner"],
  referral_reward_eligible: ["customer", "owner"],
  referral_reward_paid: ["customer", "owner"],
  profile_updated: ["customer", "owner", "manager", "admin", "broker", "vendor"],
  password_changed: ["customer", "owner", "manager", "admin", "broker", "vendor"],
  new_login_detected: ["customer", "owner", "manager", "admin", "broker", "vendor"],
  support_received: ["customer", "owner", "manager", "admin", "broker", "vendor"],
  broker_lead_assigned: ["broker"],
  broker_listing_enquiry: ["broker"],
  vendor_service_enquiry: ["vendor"],
  vendor_booking_confirmed: ["vendor"],
};

function interpolate(text: string, values: NotificationValues): string {
  return text.replace(/{{([a-zA-Z0-9_]+)}}/g, (_, key: string) => {
    const value = values[key];
    return value === undefined || value === null ? "" : String(value);
  });
}

export function renderNotificationTemplate(
  key: NotificationTemplateKey,
  values: NotificationValues = {},
): NotificationTemplate {
  const template = templates[key];
  return {
    title: interpolate(template.title, values),
    body: interpolate(template.body, values),
    ...(template.actionLabel ? { actionLabel: template.actionLabel } : {}),
  };
}

export function canReceiveNotificationTemplate(
  key: NotificationTemplateKey,
  role: NotificationRole,
): boolean {
  return allowedRoles[key].includes(role);
}

export function getNotificationTemplateKeysForRole(
  role: NotificationRole,
): NotificationTemplateKey[] {
  return (Object.keys(allowedRoles) as NotificationTemplateKey[]).filter((key) =>
    allowedRoles[key].includes(role),
  );
}
