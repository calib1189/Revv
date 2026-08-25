-- Indexes for the query patterns actually hit throughout lib/db/*.ts —
-- not speculative "just in case" coverage, each one backs a real
-- .eq()/.in()/.order() this codebase already runs. Every high-traffic
-- table so far only had its primary key indexed; a composite primary
-- key's own index only serves lookups on its LEADING column, so e.g.
-- likes' (user_id, post_id) PK does nothing for "count likes on these
-- posts" (queries by post_id, the trailing column) — exactly the
-- leaderboard/feed pattern used everywhere post/like/save/comment counts
-- are batched. All plain `create index`, not `concurrently`: this runs
-- fine as a normal statement in the SQL editor, and `concurrently` can't
-- run inside a transaction block at all, which the editor may wrap
-- statements in.

-- posts: feed pagination is cursor-based on created_at; profile pages
-- and garage-linked posts filter by author_id / vehicle_id.
create index if not exists posts_created_at_idx on posts (created_at desc);
create index if not exists posts_author_id_idx on posts (author_id);
create index if not exists posts_vehicle_id_idx on posts (vehicle_id) where vehicle_id is not null;

-- likes / saves / comments: every count-by-post and per-post list query
-- filters by post_id, the trailing (unindexed-for-this-purpose) column
-- of likes/saves' composite primary key.
create index if not exists likes_post_id_idx on likes (post_id);
create index if not exists saves_post_id_idx on saves (post_id);
create index if not exists comments_post_id_idx on comments (post_id);
create index if not exists comments_parent_id_idx on comments (parent_id) where parent_id is not null;

-- follows: follower_id is the PK's leading column already; followee_id
-- (everyone who follows a given user) is not.
create index if not exists follows_followee_id_idx on follows (followee_id);

-- vehicles: garage listing by owner, leaderboard filtering by category.
create index if not exists vehicles_owner_id_idx on vehicles (owner_id);
create index if not exists vehicles_category_idx on vehicles (category);

-- builds: vehicle_id backs every "this vehicle's active build" lookup.
-- The partial index on ai_rating_score matches the leaderboard query's
-- exact predicate (status = 'active', score not null, ordered
-- descending) so Postgres can satisfy it directly from the index instead
-- of a full-table sort once the table is actually large.
create index if not exists builds_vehicle_id_idx on builds (vehicle_id);
create index if not exists builds_leaderboard_idx
  on builds (ai_rating_score desc)
  where status = 'active' and ai_rating_score is not null;

create index if not exists build_parts_build_id_idx on build_parts (build_id);

-- notifications: a user's own list, most recent first.
create index if not exists notifications_user_id_created_at_idx
  on notifications (user_id, created_at desc);

-- messaging: message list per conversation, and finding conversations
-- where the current user is the second (unindexed) side of the pair.
create index if not exists messages_conversation_id_idx on messages (conversation_id);
create index if not exists conversations_user_b_id_idx on conversations (user_b_id);

-- post_hotspots: tapping through a post's tagged parts.
create index if not exists post_hotspots_post_id_idx on post_hotspots (post_id);
