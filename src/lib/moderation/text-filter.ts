/** A conservative, dependency-free keyword filter for caption/comment
 * text — the counterpart to the image moderation pipeline (lib/providers/
 * moderation-provider.ts), which only ever looks at photos/video frames
 * and has no opinion on what a caption or comment actually says. Not
 * exhaustive (no static list ever is, and this deliberately doesn't try
 * to catch mild profanity) — it exists to stop the clearly objectionable
 * categories Apple's UGC guideline actually cares about (hate speech,
 * sexual solicitation, direct threats/self-harm incitement) from ever
 * reaching publication, backing up — never replacing — the report/remove/
 * ban pipeline in features/admin/actions.ts, which is what handles
 * everything a fixed list can't anticipate.
 *
 * Runs inside validateCaption/validateComment, which are called from the
 * actual Server Actions (createPost's caller, createCommentAction) — not
 * just client-side forms — so it can't be bypassed by calling the action
 * directly instead of going through the UI. */

const BLOCKED_TERMS = [
  // hate speech / slurs
  "nigger",
  "nigga",
  "faggot",
  "retard",
  "tranny",
  "chink",
  "spic",
  "kike",
  // sexual solicitation
  "onlyfans",
  "nudes for",
  "sex for",
  // direct threats / self-harm incitement
  "kill yourself",
  "kys",
] as const;

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Whole-word matching (not a plain substring check) is deliberate: a
// few of these terms are also substrings of entirely ordinary words
// ("spic" inside "conspicuous"/"despicable" being the obvious one), and
// a filter that blocks a legitimate caption is worse than one that
// misses a determined evasion — the report/ban pipeline is what
// actually handles anything this static list can't catch or a user
// works around with spacing/leetspeak.
const PATTERNS = BLOCKED_TERMS.map(
  (term) => [term, new RegExp(`\\b${escapeRegExp(term)}\\b`, "i")] as const,
);

/** Returns the matched term for a friendly rejection, or null if the
 * text is clean. */
export function findObjectionableTerm(text: string): string | null {
  const normalized = text.normalize("NFKC");
  for (const [term, pattern] of PATTERNS) {
    if (pattern.test(normalized)) return term;
  }
  return null;
}
