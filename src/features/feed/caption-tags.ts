/** Hashtag helpers for the post screen, where tags live inside the
 * caption itself (the way every short-video app does it) instead of in a
 * separate field. */

const TAG_IN_TEXT = /#([\p{L}\p{N}_]+)/gu;

/** The tags already present in a caption, lower-cased, without the #. */
export function captionTags(caption: string): Set<string> {
  const found = new Set<string>();
  for (const match of caption.matchAll(TAG_IN_TEXT)) found.add(match[1].toLowerCase());
  return found;
}

/** Adds `#tag` to the end of the caption — separated from what's there by
 * a single space — unless the caption already has it (in any case). */
export function addHashtag(caption: string, tag: string): string {
  const clean = tag.replace(/^#+/, "").trim();
  if (!clean) return caption;
  if (captionTags(caption).has(clean.toLowerCase())) return caption;
  const trimmedEnd = caption.replace(/\s+$/, "");
  return trimmedEnd ? `${trimmedEnd} #${clean}` : `#${clean}`;
}

/** Removes every occurrence of `#tag` (any case) and tidies the spacing
 * it leaves behind. */
export function removeHashtag(caption: string, tag: string): string {
  const clean = tag.replace(/^#+/, "").trim();
  if (!clean) return caption;
  const escaped = clean.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return caption
    .replace(new RegExp(`(^|\\s)#${escaped}(?![\\p{L}\\p{N}_])`, "giu"), "$1")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/[ \t]+$/gm, "")
    .trim();
}
