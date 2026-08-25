import type { VehicleCategory } from "@/lib/vehicles/category";

/** Well-known nameplates checked first, since a specific model is a much
 * more reliable signal than make alone — a Toyota Supra and a Toyota
 * Camry shouldn't land in the same bucket just because they're both
 * Toyotas. Deliberately not exhaustive: this is a starting-point default
 * the category dropdown can always override before the form is ever
 * submitted, not a claim of complete or verified coverage — nothing here
 * persists on its own (same "propose, don't auto-write" spirit as the
 * photo-identify suggestions, just a deterministic lookup instead of an
 * AI call). "classics" and "track_race" aren't guessable from a model
 * name at all (a car's age or how it's actually built/used isn't
 * encoded in its nameplate), so they're left to manual selection only.
 *
 * Every keyword is matched on a whole-word boundary (see wordMatch
 * below), not a bare substring — short tokens like "rs" or "m" would
 * otherwise false-positive on unrelated models (e.g. "rs" inside
 * "Versa"). Deliberately excludes bare single-letter/two-letter tokens
 * even with word boundaries, since a lone "M" or "S" trim badge is too
 * ambiguous to guess from confidently. */
const MODEL_KEYWORDS: { category: VehicleCategory; keywords: string[] }[] = [
  {
    category: "jdm",
    keywords: [
      "supra", "86", "gt86", "brz", "gr86", "corolla gr", "gr corolla", "gr yaris",
      "skyline", "gt-r", "gtr", "silvia", "240sx", "180sx", "370z",
      "350z", "300zx", "fairlady",
      "rx-7", "rx-8", "rx7", "rx8", "miata", "mx-5", "mx5",
      "civic type r", "type r", "integra", "nsx", "s2000",
      "wrx", "sti", "impreza",
      "lancer evo", "evolution", "eclipse", "3000gt",
    ],
  },
  {
    category: "muscle_pony",
    keywords: [
      "mustang", "shelby", "gt350", "gt500",
      "camaro", "z28",
      "challenger", "charger", "hellcat", "demon", "scat pack",
      "corvette", "z06", "zr1",
      "firebird", "trans am", "gto", "chevelle", "nova", "roadrunner",
      "barracuda", "cuda",
    ],
  },
  {
    category: "euro_performance",
    keywords: [
      "m2", "m3", "m4", "m5", "m8", "amg", "rs6", "rs3", "rs4", "rs5",
      "s3", "s4", "s5", "s6", "s7", "s8", "gt3", "gt2", "911", "cayman",
      "boxster", "panamera", "quattro", "golf r", "gti",
    ],
  },
  {
    category: "supercars",
    keywords: [
      "huracan", "aventador", "gallardo", "urus", "revuelto",
      "488", "458", "sf90", "roma", "portofino", "812", "296",
      "720s", "570s", "650s", "600lt", "artura", "senna",
      "veyron", "chiron", "divo",
      "agera", "regera", "jesko",
      "huayra", "zonda",
      "valkyrie", "nevera",
    ],
  },
  {
    category: "street_bikes",
    keywords: [
      "ninja", "cbr", "gsx-r", "gsxr", "yzf", "r1", "r6", "r3",
      "panigale", "monster", "streetfighter",
      "duke", "rc390", "rc8",
      "mt-07", "mt-09", "mt-10",
      "gixxer",
    ],
  },
  {
    category: "cruisers_choppers",
    keywords: [
      "sportster", "softail", "fat boy", "fatboy", "road king",
      "road glide", "street glide", "electra glide", "iron 883",
      "chief", "scout", "roadmaster",
      "vulcan", "rebel", "shadow",
    ],
  },
];

/** Makes that don't also sell everyday cars, so a make-only match is
 * still a safe default — anything sold as an "everyday car" brand (even
 * ones with a performance halo model, like Honda or BMW) is deliberately
 * left out of this list; those are only matched by the specific model
 * keywords above so a Honda Civic doesn't get bucketed the same as a
 * Honda CBR. */
const MAKE_ONLY: { category: VehicleCategory; makes: string[] }[] = [
  { category: "supercars", makes: ["ferrari", "lamborghini", "mclaren", "bugatti", "koenigsegg", "pagani", "rimac", "pininfarina"] },
  { category: "cruisers_choppers", makes: ["harley-davidson", "harley davidson", "indian motorcycle", "indian"] },
  { category: "street_bikes", makes: ["ducati", "kawasaki", "aprilia", "triumph"] },
];

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Whole-word/whole-phrase containment, not a bare substring — "\bversa\b"
 * shouldn't light up just because it contains "rs". Keywords with
 * internal punctuation (e.g. "rx-7") keep that punctuation as a literal
 * boundary rather than a word-character, which is exactly right here. */
function wordMatch(haystack: string, keyword: string): boolean {
  return new RegExp(`(?:^|[^a-z0-9])${escapeRegExp(keyword)}(?:$|[^a-z0-9])`).test(haystack);
}

function normalize(value: string): string {
  return value.toLowerCase().trim();
}

/** Best-effort category guess from a make/model pair, for pre-filling
 * the category field as the vehicle form is filled out — never applied
 * without the field staying visible and editable, and never itself the
 * thing that gets saved; the form's own submit is what actually confirms
 * it, same as every other field here. Returns null (leave whatever's
 * already selected alone) when nothing matches, rather than forcing the
 * "cars" default over a choice the user already made. */
export function guessVehicleCategory(make: string, model: string): VehicleCategory | null {
  const m = normalize(model);
  for (const { category, keywords } of MODEL_KEYWORDS) {
    if (keywords.some((kw) => wordMatch(m, kw))) return category;
  }

  const mk = normalize(make);
  for (const { category, makes } of MAKE_ONLY) {
    if (makes.some((name) => wordMatch(mk, name))) return category;
  }

  return null;
}
