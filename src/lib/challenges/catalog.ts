export interface ChallengeDef {
  id: string;
  name: string;
  description: string;
  target: number;
}

/** Fixed weekly challenge templates — the same set every week, resetting
 * every Monday (see week.ts). Each one pushes on a real stage of the
 * core loop (post, get engagement, rate your build, join the
 * conversation) rather than being an arbitrary task, matching the same
 * "does this strengthen the loop" bar achievements are held to. */
export const CHALLENGES: ChallengeDef[] = [
  {
    id: "post_3",
    name: "Triple Threat",
    description: "Post 3 times this week",
    target: 3,
  },
  {
    id: "rate_a_build",
    name: "Check Your Score",
    description: "Rate a build this week",
    target: 1,
  },
  {
    id: "get_20_likes",
    name: "Crowd Pleaser",
    description: "Get 20 likes on your posts this week",
    target: 20,
  },
  {
    id: "comment_5",
    name: "Join the Conversation",
    description: "Comment on 5 posts this week",
    target: 5,
  },
];

const CHALLENGE_BY_ID = new Map(CHALLENGES.map((c) => [c.id, c]));

export function getChallenge(id: string): ChallengeDef | undefined {
  return CHALLENGE_BY_ID.get(id);
}
