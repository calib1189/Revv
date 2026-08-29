-- A promoted shop was only ever re-sorted/badged among whatever Google's
-- own Text Search happened to return for a category browse — it had no
-- guaranteed visibility at all. A real business paid to promote a
-- listing that a broad keyword search (Google's own relevance ranking,
-- not REVV's) simply never surfaced, so the promotion produced zero
-- visibility despite being genuinely active. Capturing which category
-- the promoter actually intends lets the search action inject the
-- promotion directly when Google's organic results are missing it —
-- see the application-level change alongside this migration.
--
-- Nullable, not required: every promotion that already exists was
-- bought before this column existed and has no category to fall back
-- to. Rather than leave those with the same zero-guarantee visibility
-- they've had all along, a null category is treated as "inject into
-- every category browse" — more visibility than a paying customer
-- asked for is a safer default than the one that just failed them.

alter table shop_promotions
  add column category text check (
    category is null or category in (
      'repair', 'body_shop', 'tint', 'exhaust', 'tires_wheels', 'performance', 'detailing', 'audio'
    )
  );
