-- Removes the AI assistant chat feature and the AI mod visualizer
-- feature entirely — both were real per-call Gemini API cost with no
-- revenue behind them, cut to control monthly running cost. Vehicle ID
-- and build rating (the other two Gemini-backed features) are untouched.

drop function if exists public.under_ai_assistant_rate_limit(uuid);
drop table if exists ai_assistant_messages;

drop function if exists public.under_ai_visualize_rate_limit(uuid);
drop table if exists ai_visualize_attempts;
