@AGENTS.md

# REVV

Automotive social platform: social feed + digital garage + structured build data. Think Instagram/TikTok for the content layer, PCPartPicker for the data layer.

This file is the contract. If a request in a session conflicts with anything in "Invariants" or "Never do this", stop and say so instead of complying.

## Stack

* Next.js (App Router) + React + TypeScript (strict)
* Tailwind CSS
* Supabase: Postgres, Auth, Storage, RLS
* Deployed on Vercel

No additional runtime dependency without asking first. Justify it in one line (what it does, why hand-rolling is worse) and wait for approval.

## Invariants

These are load-bearing. Every version depends on them. Breaking one is a rewrite.

1. **The build owns the parts. Everything else references them.**
   A `build_part` row is the single record of "this car has this mod." Product cards, tag targets, budget totals, copy-build, and fitment all read from it. Never create a parallel list of mods anywhere else.
2. **Hotspots point at `build_parts`, never at free text or at `parts` directly.**
   Post tagging is: owner picks a point on the media, then picks from their own build's parts. This is why tagging works without computer vision. A hotspot whose `build_part_id` is null is invalid — don't allow it.
3. **Aggregates are computed, never stored.**
   Total invested, horsepower, weight, mod count, build completion percentage — all derived from `build_parts` at read time (view or query). No denormalized counter columns for these. If a page gets slow, add a materialized view and say so; do not add a column someone has to remember to update.
4. **Money is integer cents. Always.** Column names end in `_cents`. No floats.
5. **AI proposes, the owner confirms, only confirmed data persists.**
   Vision output, spec guesses, and generated values go into a pending/confirm UI. The user's confirmation is what writes to `vehicles`, `build_parts`, or `parts`. Store the AI's confidence alongside its suggestion; never hide it.
6. **Fitment is deterministic arithmetic. No LLM in the calculation path.**
   An LLM may help a user describe what they want. It never decides whether a wheel fits. Missing input data returns "insufficient data", not a guess.
7. **Unverified data is labeled unverified, in the UI, every time.**
   `parts.verified` is false by default. A product card built from unverified data must visibly say so.
8. **Every external provider sits behind an interface.**
   `VisionProvider`, `ImageGenerationProvider`, `ChatProvider`, `AffiliateProvider`. Swappable via env config. A clearly-labeled mock implementation for local dev — the UI must show that it is a mock, never present mock output as real.
9. **RLS on every table, from the first migration.**
   Default deny. A user reads public content and writes only their own rows. Never use the service role key in client-reachable code.

## Schema

Core shape. Add columns freely; don't restructure these relationships.

```
profiles          id -> auth.users, username, bio, avatar_media_id
vehicles          owner_id, year, make, model, trim, engine, drivetrain,
                  color, mileage, nickname, description, hero_media_id
builds            vehicle_id, status(active|draft|archived), title,
                  budget_cents, copied_from_build_id
parts             brand, product, category, part_number, specs jsonb,
                  verified bool default false, source
build_parts       build_id, part_id nullable, raw_name, category,
                  status(planned|ordered|installed), price_cents,
                  install_cost_cents, installed_at, notes
media             owner_id, storage_path, kind(image|video), width, height,
                  duration_ms
posts             author_id, vehicle_id, build_id, post_type, caption
post_media        post_id, media_id, position
post_hotspots     post_id, media_id, x, y, t_ms nullable, build_part_id
likes / saves     user_id, post_id, unique(user_id, post_id)
comments          post_id, author_id, body, parent_id
follows           follower_id, followee_id, unique pair
reports           reporter_id, target_type, target_id, reason, status
notifications     user_id, kind, actor_id, target_type, target_id, read_at
maintenance       vehicle_id, kind, performed_at, mileage, cost_cents, notes
events            user_id nullable, name, props jsonb, created_at
```

Notes:

* A vehicle has one `active` build. Copy-build creates a `draft` build on the copier's vehicle with `copied_from_build_id` set. Nothing is written to the active build until the user reviews and accepts.
* `build_parts.part_id` is nullable on purpose. Users type "Apex EC-7 18x9.5 +35" before that part exists in the catalog. `raw_name` holds it; an admin or matching job promotes it to a `parts` row later. Never block a user's entry on catalog coverage.
* `post_hotspots.t_ms` is null for photos, set for video. Decide photo-only or video tagging per version; the column supports both.

Migrations are append-only. Never edit an applied migration — write a new one.

## Conventions

* TypeScript strict. No `any`. Generate DB types from Supabase; don't hand-write row interfaces.
* Server Components by default. `"use client"` only where interaction requires it.
* Data access lives in `lib/db/*.ts`, one module per entity. Components never build queries inline.
* Feature code in `features/<name>/`, shared UI in `components/ui/`.
* Loading, empty, and error states are part of the component, not a follow-up. A page without all three is not done.
* Mobile layout is the default; desktop is the enhancement. Not the reverse.
* Dark-first design. Premium and restrained: large photography, generous spacing, subtle motion. No gradient blobs, no glowing borders, no emoji in UI.

## Working agreement

One vertical slice per session. A slice goes migration → data access → API → UI → states, for one feature. Do not scaffold features from later versions "while you're in there." Empty placeholder files and TODO routes for future versions are worse than nothing.

Before you inspect, don't assume. Read the existing code first. Preserve working functionality. If you think something needs restructuring, say what and why before doing it.

Definition of done, every session, before you report success:

1. `tsc --noEmit` clean
2. lint clean
3. tests pass — and fitment, budget math, and copy-build diffing have tests written before the implementation
4. no broken imports, no console errors
5. RLS policies exist for any new table
6. checked at mobile width, not just desktop
7. brief summary of what changed and what you deliberately left out

If you can't finish a slice cleanly, stop and report the blocker. Do not leave half-wired code that typechecks.

## Never do this

* Invent product specs, prices, part numbers, or compatibility data
* Use an LLM to produce a final fitment verdict
* Claim a modification fits without verified data behind it
* Present mock provider output as real AI
* Put secret keys in client code or commit them
* Store a computed aggregate as a column
* Create a hotspot not backed by a build_part
* Edit an applied migration
* Add a dependency without asking

## Roadmap

Numbering follows the version prompts. Three deliberate changes from the original order, marked ★ — each because a later feature depends on it.

* V0 Foundation: shell, routing, design system, schema, auth
* V1 Garage: vehicles CRUD, photos, vehicle profile, RLS
* V2 Feed: posts, media, likes, comments, saves, share URL, reports
   * ★ include like/comment/follow notifications here, not at V12
* V3 Profiles + build pages: follows, timeline, modifications, public build page
   * ★ include public share URL + OG image for build pages here. This is the acquisition loop — people post the link to forums and IG. It cannot wait for the V18 polish pass.
* V4 AI vehicle identification (behind `VisionProvider`)
* V5 AI mod visualizer (behind `ImageGenerationProvider`), before/after, share to post
* V6 Interactive mods: parts catalog, hotspot tagging, product cards
* V7 ★ Fitment engine — moved ahead of copy build, which depends on it
* V8 Copy build: draft build, compatibility diff, review screen
* V9 Build budget
* V10 Maintenance
* V11 Discover / vertical video feed
* V12 Messaging + blocking (notifications already shipped in V2)
* V13 Parts discovery + affiliate abstraction
* V14 Monetization (Stripe-ready, env-gated)
* V15 REVV AI assistant over the user's own data
* V16 Admin + moderation + audit logs
* V17 Analytics
* V18 Launch polish

Do not start a version until the previous one passes its own definition of done.
