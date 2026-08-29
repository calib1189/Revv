/** Curated rather than a full emoji picker — a dependency-free grid beats
 * pulling in an emoji-picker library for what's really a small, car- and
 * social-content-relevant set. Rendered as text layers (see TextLayer.isSticker
 * in types.ts), so any glyph the platform can draw works without a new
 * asset pipeline. */
export const STICKER_EMOJIS: string[] = [
  "🔥", "💯", "⚡", "🏁", "🚗", "🚙", "🏎️", "🛞",
  "⭐", "✨", "💨", "😎", "🤘", "👀", "❤️", "💪",
  "🔧", "⛽", "🎉", "📸", "🏆", "💰", "😱", "🙌",
];
