/** How each notification kind reads after the actor's name, on the
 * Activity page and the inbox's Activity row. */
export const NOTIFICATION_VERBS: Record<string, string> = {
  like: "liked your post",
  comment: "commented on your post",
  comment_reply: "replied to your comment",
  follow: "started following you",
  peer_rating: "rated your ride",
  crew_join_request: "requested to join your crew",
  crew_join_approved: "approved your request to join",
  crew_post: "posted in a crew you're in",
  meetup_attending: "is going to your meet",
  shop_review: "reviewed your shop",
  story_mention: "mentioned you in their story",
  story_answer: "answered your question",
  comment_reaction: "reacted to your comment",
  story_reaction: "reacted to your story",
  invite_joined: "joined SORZA from your invite",
  // These four have no actor — an admin decision or an automated check,
  // never a specific person to attribute it to (see the triggers in
  // 0092_more_notification_kinds.sql, every one inserts actor_id: null).
  // Rendered with username "SORZA" (the page's existing fallback for a
  // null actor_id), so the sentence needs to read naturally after that.
  meetup_approved: "approved your meet — it's live",
  meetup_rejected: "didn't approve your meet",
  ad_approved: "approved your ad — it's live",
  vehicle_verified: "verified your vehicle",
};

/** Kinds with no actor: an admin decision or an automated check. The
 * inbox groups these as "System notifications". */
export const SYSTEM_NOTIFICATION_KINDS = new Set(["meetup_approved", "meetup_rejected", "ad_approved", "vehicle_verified"]);
