-- Lets a build's owner drop in their own affiliate link for a tagged
-- part, used instead of REVV's own generated AffiliateProvider link
-- when present — a creator with their own Amazon Associates (or any
-- other retailer's) account gets paid directly by that program, no
-- REVV-held funds or payout system involved. REVV's own affiliate link
-- stays the fallback for anyone who doesn't have one. No RLS changes
-- needed: build_parts' existing "owners manage build_parts on their
-- own builds" policy (0001_init.sql) already covers every column,
-- this one included.

alter table build_parts
  add column owner_affiliate_url text
  check (owner_affiliate_url is null or owner_affiliate_url ~ '^https?://');
