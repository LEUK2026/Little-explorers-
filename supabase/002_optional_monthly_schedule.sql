-- OPTIONAL: run after you have tested invoices and approved the fee policy.
-- Creates one database-owned scheduler for BOTH Vercel production sites.
-- On the 1st of each month at 04:00 UTC, draft the previous full calendar month.
-- This does NOT email parents or collect money. Admin reviews and issues drafts.
-- If using this schedule, DO NOT also configure the Vercel invoice cron.
create extension if not exists pg_cron with schema pg_catalog;
select cron.schedule(
  'little-explorers-monthly-invoice-drafts',
  '0 4 1 * *',
  $$ select public.generate_invoice_drafts(
    date_trunc('month',now() - interval '1 month')::date,
    (date_trunc('month',now()) - interval '1 day')::date
  ); $$
);
-- To turn it off later: select cron.unschedule('little-explorers-monthly-invoice-drafts');
