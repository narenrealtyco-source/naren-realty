export type EventCategoryRecord = { key: string; title: string; aliases?: string[] };

export const EVENT_CATEGORIES: EventCategoryRecord[] = [
  { key: "workshops", title: "Workshops", aliases: ["workshop", "workshops_activities"] },
  { key: "comedy_shows", title: "Comedy Shows", aliases: ["comedy", "stand_up", "standup"] },
  { key: "music_shows", title: "Music Shows", aliases: ["music", "live_music", "concert"] },
  { key: "performances", title: "Performances", aliases: ["performance", "dance_performances", "cultural"] },
  { key: "kids", title: "Kids", aliases: ["children", "kids_events"] },
  { key: "conferences", title: "Conferences", aliases: ["conference", "networking"] },
  { key: "exhibitions", title: "Exhibitions", aliases: ["exhibition", "expo", "art_show"] },
  { key: "new_year_parties", title: "New Year Parties", aliases: ["new_year", "new_year_party"] },
  { key: "screening", title: "Screening", aliases: ["movie_screening", "match_screening", "movie_match_screening"] },
  { key: "spirituality", title: "Spirituality", aliases: ["spiritual", "bhajan", "bhajan_jamming", "meditation"] },
  { key: "meetups", title: "Meetups", aliases: ["meetup", "social_meetups", "community", "home_gatherings", "outdoor_active"] },
  { key: "talks", title: "Talks", aliases: ["talk", "speaker", "panel_discussion"] },
  { key: "beer_festival", title: "Beer Festival", aliases: ["beer", "beerfest", "brewery"] },
  { key: "role_play", title: "Role Play", aliases: ["roleplay", "cosplay"] },
  { key: "online_streaming_events", title: "Online Streaming Events", aliases: ["online_streaming", "streaming", "online"] },
  { key: "food_drinks", title: "Food and Drinks", aliases: ["food", "drinks", "food_drinks", "potluck_dinner", "byob_party", "brunch_meetup", "bbq_bonfire"] },
];

const normalise = (value: string | null | undefined) =>
  (value ?? "").toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");

export function getEventCategoryKey(event: {
  category?: string | null;
  subcategory?: string | null;
  custom_event_type?: string | null;
  title?: string | null;
  event_mode?: string | null;
}): string {
  const direct = normalise(event.category);
  if (EVENT_CATEGORIES.some((item) => item.key === direct)) return direct;

  const details = [event.subcategory, event.custom_event_type, event.title, event.category]
    .map(normalise).filter(Boolean).join("_");
  const has = (...terms: string[]) => terms.some((term) => details.includes(term));

  if (has("new_year")) return "new_year_parties";
  if (has("beer", "brewery")) return "beer_festival";
  if (has("role_play", "roleplay", "cosplay")) return "role_play";
  if (has("online_stream", "livestream", "streaming")) return "online_streaming_events";
  if (has("screening", "movie", "match")) return "screening";
  if (has("spiritual", "bhajan", "meditation", "yoga")) return "spirituality";
  if (has("food", "drink", "potluck", "brunch", "bbq", "byob", "cooking", "baking")) return "food_drinks";
  if (has("comedy", "stand_up", "standup")) return "comedy_shows";
  if (has("music", "concert", "jamming", "dj")) return "music_shows";
  if (has("workshop", "paint_and_sip", "trivia", "quiz")) return "workshops";
  if (has("kid", "child", "family")) return "kids";
  if (has("conference", "summit", "networking")) return "conferences";
  if (has("exhibition", "expo", "gallery")) return "exhibitions";
  if (has("talk", "lecture", "panel", "discussion")) return "talks";
  if (has("performance", "dance", "theatre", "theater", "cultural")) return "performances";
  if (direct === "workshops_activities") return "workshops";
  if (direct === "social_meetups" || direct === "community" || direct === "home_gatherings" || direct === "outdoor_active") return "meetups";
  if (direct === "cultural") return "performances";
  return "";
}
