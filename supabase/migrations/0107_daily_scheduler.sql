-- Sorza Daily, part 5: the hourly scheduler. Run after 0106, and only
-- after doing the one-time setup below.
--
-- Supabase's own scheduler (pg_cron) calls the app's /api/cron/daily
-- endpoint at the top of every hour, through pg_net. That endpoint is
-- safe to call any number of times: it creates today's challenge if
-- needed, settles finished challenges, and sends whichever Daily pushes
-- are due, never one twice (see 0106's daily_push_log).
--
-- ONE-TIME SETUP, before running this file:
--   1. Supabase Dashboard -> Database -> Extensions: enable pg_cron and
--      pg_net.
--   2. In the SQL editor, store the same CRON_SECRET the app has in
--      Vercel (Project -> Settings -> Environment Variables), replacing
--      the placeholder:
--        select vault.create_secret('PASTE_CRON_SECRET_HERE', 'sorza_cron_secret');
--   Never commit the real secret to this repository.

create extension if not exists pg_cron;
create extension if not exists pg_net;

-- Re-running this file replaces the job instead of adding a second one.
select cron.unschedule(jobid) from cron.job where jobname = 'sorza-daily-hourly';

select cron.schedule(
  'sorza-daily-hourly',
  '0 * * * *',
  $$
  select net.http_get(
    url := 'https://sorza.net/api/cron/daily',
    headers := jsonb_build_object(
      'Authorization',
      'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'sorza_cron_secret')
    ),
    timeout_milliseconds := 55000
  );
  $$
);
