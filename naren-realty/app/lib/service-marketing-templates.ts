/**
 * NAREN REALTY Home Services notification copy.
 * Brand voice: premium + friendly, English.
 * Copy catalogue only: this file does not schedule or deliver notifications.
 * Promotional campaigns must be sent only to opted-in users with an opt-out route.
 */

export type HomeServiceCategory =
  | "electrician"
  | "plumber"
  | "home_cleaning"
  | "painting"
  | "ac_repair_service"
  | "carpenter"
  | "pest_control"
  | "packers_movers"
  | "interior_design"
  | "appliance_repair"
  | "ro_water_purifier"
  | "cctv_security"
  | "waterproofing"
  | "furniture"
  | "gardening";

export type HomeServiceNotification = {
  category: HomeServiceCategory;
  serviceName: string;
  title: string;
  body: string;
  actionLabel: string;
};

export const homeServiceMarketingNotifications: HomeServiceNotification[] = [
  {
    category: "electrician",
    serviceName: "Electrician",
    title: "⚡ Need an Electrical Fix?",
    body: "Lights, fans, switches or wiring — find help for your home with NAREN REALTY.",
    actionLabel: "Find an Electrician",
  },
  {
    category: "plumber",
    serviceName: "Plumber",
    title: "🔧 Let's Get That Leak Sorted!",
    body: "From leaking taps to plumbing repairs, explore service options for your home.",
    actionLabel: "Find a Plumber",
  },
  {
    category: "home_cleaning",
    serviceName: "Home Cleaning",
    title: "✨ A Fresh Home Feels Different!",
    body: "Need deep cleaning or a quick refresh? Explore home cleaning services.",
    actionLabel: "Explore Cleaning",
  },
  {
    category: "painting",
    serviceName: "Painting",
    title: "🎨 Ready for a Fresh New Look?",
    body: "Give your walls a makeover. Explore painting services for your space.",
    actionLabel: "Explore Painting",
  },
  {
    category: "ac_repair_service",
    serviceName: "AC Repair & Service",
    title: "❄️ Time for an AC Check?",
    body: "Keep your space comfortable with AC servicing and repair options.",
    actionLabel: "Find AC Services",
  },
  {
    category: "carpenter",
    serviceName: "Carpenter",
    title: "🪚 Small Fixes. Better Living.",
    body: "Need help with doors, fittings or furniture repairs? Explore carpentry services.",
    actionLabel: "Find a Carpenter",
  },
  {
    category: "pest_control",
    serviceName: "Pest Control",
    title: "🏠 Keep Your Home Feeling Fresh",
    body: "Explore pest-control service options and find support for your home.",
    actionLabel: "Explore Pest Control",
  },
  {
    category: "packers_movers",
    serviceName: "Packers & Movers",
    title: "📦 Moving Soon? We've Got You!",
    body: "Make your next move easier. Explore packers and movers services.",
    actionLabel: "Explore Moving Services",
  },
  {
    category: "interior_design",
    serviceName: "Interior Design",
    title: "✨ Imagine a Space That Feels Like You",
    body: "From thoughtful upgrades to fresh interiors, explore interior design services.",
    actionLabel: "Explore Interiors",
  },
  {
    category: "appliance_repair",
    serviceName: "Appliance Repair",
    title: "🧰 Need a Quick Appliance Fix?",
    body: "Explore repair options for the everyday appliances that keep your home running.",
    actionLabel: "Find Repair Services",
  },
  {
    category: "ro_water_purifier",
    serviceName: "RO / Water Purifier",
    title: "💦 Better Water Starts with Good Care",
    body: "Looking for RO or water purifier servicing? Explore available service options.",
    actionLabel: "Find RO Services",
  },
  {
    category: "cctv_security",
    serviceName: "CCTV & Security",
    title: "🔐 Make Your Home Feel More Secure",
    body: "Explore CCTV and home security solutions for added peace of mind.",
    actionLabel: "Explore Security Services",
  },
  {
    category: "waterproofing",
    serviceName: "Waterproofing",
    title: "💧 Protect Your Home from Leaks",
    body: "Explore waterproofing services to help protect your space from seepage and dampness.",
    actionLabel: "Explore Waterproofing",
  },
  {
    category: "furniture",
    serviceName: "Furniture",
    title: "🛋️ Time to Upgrade Your Space?",
    body: "Explore furniture options to make your home more comfortable and your own.",
    actionLabel: "Explore Furniture",
  },
  {
    category: "gardening",
    serviceName: "Gardening",
    title: "🌿 Bring More Green Into Your Space",
    body: "Explore gardening and plant-care services to give your space a fresh touch.",
    actionLabel: "Explore Gardening",
  },
];

export const homeServiceGeneralNotifications = {
  customerWelcome: {
    title: "A Little Help Around the House? 🏡",
    body: "From everyday fixes to home upgrades, explore service options for your space with NAREN REALTY.",
    actionLabel: "Explore Home Services",
  },
  newHome: {
    title: "New Home? Get Move-In Ready! 🗝️",
    body: "Settling into a new place? Explore cleaning, painting, repairs and moving service options.",
    actionLabel: "Get Move-In Help",
  },
  ownerPropertyReady: {
    title: "Get Your Property Tenant-Ready 🏡",
    body: "Preparing to rent or sell? Explore cleaning, painting and repair service options before your next showing.",
    actionLabel: "Prepare My Property",
  },
  vendorJoin: {
    title: "Grow Your Service Business with NAREN REALTY 🚀",
    body: "Showcase your services to people looking for home solutions. Register your service business to get started.",
    actionLabel: "Join as a Service Partner",
  },
  vendorProfile: {
    title: "Your Service Profile Is Almost Ready 👋",
    body: "Complete your service details, coverage areas and contact information so customers know what you offer.",
    actionLabel: "Complete My Profile",
  },
};

export const homeServiceBookingNotifications = {
  requestReceived: {
    title: "We've Got Your Request! 📩",
    body: "Your {{serviceName}} request has been received. We'll keep you updated on the next steps.",
    actionLabel: "View Request",
  },
  vendorAssigned: {
    title: "Your Service Partner Is Assigned! 🤝",
    body: "A service partner has been assigned to your {{serviceName}} request. Check the details for the next steps.",
    actionLabel: "View Booking",
  },
  bookingConfirmed: {
    title: "It's Confirmed! ✅",
    body: "Your {{serviceName}} appointment is set for {{date}} at {{time}}.",
    actionLabel: "View Booking",
  },
  reminder: {
    title: "Your Service Is Coming Up! ⏰",
    body: "A quick reminder about your {{serviceName}} appointment on {{date}} at {{time}}.",
    actionLabel: "View Booking",
  },
  rescheduled: {
    title: "Your Appointment Has Been Updated 🔄",
    body: "Your {{serviceName}} appointment is now scheduled for {{date}} at {{time}}.",
    actionLabel: "View Booking",
  },
  completed: {
    title: "Service Completed! ✨",
    body: "Your {{serviceName}} service has been marked complete. We hope everything went smoothly.",
    actionLabel: "Share Feedback",
  },
  feedback: {
    title: "How Was Your Experience? ⭐",
    body: "Your feedback about the {{serviceName}} service helps us make NAREN REALTY better.",
    actionLabel: "Rate Your Experience",
  },
  cancelled: {
    title: "Your Booking Has Been Cancelled",
    body: "Your {{serviceName}} booking has been cancelled. Contact our team if you need help.",
    actionLabel: "View Booking",
  },
};

export const homeServiceMarketingOptOutFooter =
  "You're receiving this because you opted in to NAREN REALTY updates. You can unsubscribe from promotional messages in your notification preferences.";
