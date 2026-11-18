-- Little Explorers: run once in a NEW Supabase project, SQL Editor.
-- Existing installations require migrations, not a second execution of this schema.
-- Never use a service-role key in browser code. Parent permissions are enforced by RLS.

create extension if not exists pgcrypto;
create schema if not exists private;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text not null default '',
  phone text not null default '',
  role text not null default 'parent' check (role in ('parent','admin')),
  approved boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.enquiries (
  id uuid primary key default gen_random_uuid(),
  parent_id uuid not null references public.profiles(id) on delete cascade,
  child_name text not null,
  requested_start date,
  message text not null default '',
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  approval_email_sent_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.children (
  id uuid primary key default gen_random_uuid(),
  enquiry_id uuid unique references public.enquiries(id),
  parent_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  hourly_rate_pence integer not null default 0 check (hourly_rate_pence between 0 and 50000),
  created_at timestamptz not null default now()
);

create table public.child_onboarding (
  child_id uuid primary key references public.children(id) on delete cascade,
  date_of_birth date not null,
  address text not null,
  emergency_contact text not null,
  medical_information text not null default '',
  sunscreen_allowed boolean not null default false,
  outings_allowed boolean not null default false,
  photo_consent boolean not null default false,
  special_needs boolean not null default false,
  special_needs_details text not null default '',
  areas_to_support text not null default '',
  sleeping_routine text not null default '',
  feeding_eating text not null default '',
  completed_on date not null,
  review_due_on date not null,
  updated_at timestamptz not null default now(),
  constraint support_details_required check (not special_needs or length(trim(special_needs_details)) > 0),
  constraint review_due_valid check (review_due_on=(completed_on + interval '6 months')::date)
);

create table public.attendance (
  id uuid primary key default gen_random_uuid(),
  child_id uuid not null references public.children(id) on delete restrict,
  attended_on date not null,
  checked_in time not null,
  checked_out time not null,
  minutes integer not null check (minutes between 1 and 960),
  rate_pence integer not null check (rate_pence between 0 and 50000),
  notes text not null default '',
  recorded_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  constraint attendance_time_order check (checked_out > checked_in),
  constraint attendance_unique unique(child_id, attended_on, checked_in, checked_out)
);

create table public.incidents (
  id uuid primary key default gen_random_uuid(),
  child_id uuid not null references public.children(id) on delete restrict,
  happened_on date not null,
  title text not null,
  description text not null,
  action_taken text not null,
  recorded_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

create table public.incident_acknowledgements (
  incident_id uuid not null references public.incidents(id) on delete cascade,
  parent_id uuid not null references public.profiles(id) on delete cascade,
  acknowledged_at timestamptz not null default now(),
  primary key(incident_id, parent_id)
);

create table public.photos (
  id uuid primary key default gen_random_uuid(),
  child_id uuid not null references public.children(id) on delete restrict,
  storage_path text not null unique,
  caption text not null default '',
  uploaded_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

create table public.invoices (
  id uuid primary key default gen_random_uuid(),
  invoice_number bigint generated always as identity unique,
  parent_id uuid not null references public.profiles(id) on delete restrict,
  period_start date not null,
  period_end date not null,
  status text not null default 'draft' check (status in ('draft','issued','pending','paid','failed','void')),
  total_pence integer not null default 0 check (total_pence >= 0),
  due_on date not null,
  issued_at timestamptz,
  email_sent_at timestamptz,
  gocardless_payment_id text unique,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  unique(parent_id,period_start,period_end),
  check(period_end >= period_start)
);

create table public.invoice_items (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references public.invoices(id) on delete cascade,
  attendance_id uuid not null unique references public.attendance(id) on delete restrict,
  child_id uuid not null references public.children(id) on delete restrict,
  attended_on date not null,
  minutes integer not null,
  rate_pence integer not null,
  amount_pence integer not null check(amount_pence >= 0)
);

create table public.mandates (
  parent_id uuid primary key references public.profiles(id) on delete cascade,
  mandate_id text not null unique,
  created_at timestamptz not null default now()
);

create table public.mandate_setup_sessions (
  redirect_flow_id text primary key,
  parent_id uuid not null references public.profiles(id) on delete cascade,
  session_token uuid not null,
  expires_at timestamptz not null default now() + interval '30 minutes',
  created_at timestamptz not null default now()
);

create table public.payment_webhook_events (
  id text primary key,
  received_at timestamptz not null default now()
);

create table public.audit_logs (
  id bigint generated always as identity primary key,
  actor_id uuid references public.profiles(id),
  action text not null,
  target_id text not null,
  created_at timestamptz not null default now()
);

create table public.job_heartbeats (
  name text primary key,
  last_success timestamptz not null,
  details text not null default ''
);

create index attendance_child_date_idx on public.attendance(child_id,attended_on);
create index children_parent_idx on public.children(parent_id);
create index incidents_child_date_idx on public.incidents(child_id,happened_on);
create index invoices_parent_created_idx on public.invoices(parent_id,created_at desc);
create index enquiries_status_idx on public.enquiries(status,created_at);
create index photos_child_idx on public.photos(child_id,created_at desc);

-- Prevent a second overlapping session for the same child, including concurrent inserts.
create or replace function private.validate_attendance() returns trigger
language plpgsql set search_path = '' as $$
begin
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext(new.child_id::text));
  if new.minutes <> (extract(epoch from (new.checked_out-new.checked_in))/60)::integer then
    raise exception 'Attendance minutes do not match the recorded times';
  end if;
  if exists(select 1 from public.attendance a where a.child_id=new.child_id
    and a.attended_on=new.attended_on and a.id<>new.id
    and a.checked_in<new.checked_out and a.checked_out>new.checked_in) then
    raise exception 'Overlapping childcare attendance session';
  end if;
  return new;
end $$;
create trigger validate_attendance before insert or update on public.attendance
for each row execute function private.validate_attendance();

-- New users can only become parents. Never trust a role supplied during sign-up.
create or replace function private.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles(id,email,full_name,phone)
  values(new.id,coalesce(new.email,''),left(coalesce(new.raw_user_meta_data->>'full_name',''),120),left(coalesce(new.raw_user_meta_data->>'phone',''),40));
  if nullif(trim(coalesce(new.raw_user_meta_data->>'child_name','')),'') is not null then
    insert into public.enquiries(parent_id,child_name,requested_start,message)
    values(new.id,left(new.raw_user_meta_data->>'child_name',120),
      case when (new.raw_user_meta_data->>'requested_start') ~ '^\d{4}-\d{2}-\d{2}$'
           then (new.raw_user_meta_data->>'requested_start')::date else null end,
      left(coalesce(new.raw_user_meta_data->>'message',''),2000));
  end if;
  return new;
end $$;

create trigger on_auth_user_created after insert on auth.users
for each row execute function private.handle_new_user();

create or replace function private.is_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.profiles where id=(select auth.uid()) and role='admin')
    and (select auth.jwt()->>'aal')='aal2';
$$;
create or replace function private.is_approved_parent() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.profiles where id=(select auth.uid()) and role='parent' and approved=true);
$$;
create or replace function private.owns_child(p_child uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.children where id=p_child and parent_id=(select auth.uid()))
    and private.is_approved_parent();
$$;

grant usage on schema private to authenticated;
grant execute on function private.is_admin() to authenticated;
grant execute on function private.is_approved_parent() to authenticated;
grant execute on function private.owns_child(uuid) to authenticated;

alter table public.profiles enable row level security;
alter table public.enquiries enable row level security;
alter table public.children enable row level security;
alter table public.child_onboarding enable row level security;
alter table public.attendance enable row level security;
alter table public.incidents enable row level security;
alter table public.incident_acknowledgements enable row level security;
alter table public.photos enable row level security;
alter table public.invoices enable row level security;
alter table public.invoice_items enable row level security;
alter table public.mandates enable row level security;
alter table public.mandate_setup_sessions enable row level security;
alter table public.payment_webhook_events enable row level security;
alter table public.audit_logs enable row level security;
alter table public.job_heartbeats enable row level security;

create policy profiles_read on public.profiles for select to authenticated
using(id=(select auth.uid()) or private.is_admin());
-- Intentional: authenticated clients cannot edit profile roles or approvals.
create policy enquiries_read on public.enquiries for select to authenticated
using(parent_id=(select auth.uid()) or private.is_admin());
create policy children_read on public.children for select to authenticated
using(private.owns_child(id) or private.is_admin());
create policy onboarding_read on public.child_onboarding for select to authenticated
using(private.owns_child(child_id) or private.is_admin());
create policy onboarding_insert on public.child_onboarding for insert to authenticated
with check(private.owns_child(child_id));
create policy onboarding_update on public.child_onboarding for update to authenticated
using(private.owns_child(child_id)) with check(private.owns_child(child_id));
create policy attendance_read on public.attendance for select to authenticated
using(private.owns_child(child_id) or private.is_admin());
create policy incidents_read on public.incidents for select to authenticated
using(private.owns_child(child_id) or private.is_admin());
create policy ack_read on public.incident_acknowledgements for select to authenticated
using(parent_id=(select auth.uid()) or private.is_admin());
create policy ack_insert on public.incident_acknowledgements for insert to authenticated
with check(parent_id=(select auth.uid()) and exists (
  select 1 from public.incidents i where i.id=incident_id and private.owns_child(i.child_id)));
create policy photos_read on public.photos for select to authenticated
using(private.is_admin() or (private.owns_child(child_id) and exists (
  select 1 from public.child_onboarding o where o.child_id=photos.child_id and o.photo_consent=true)));
create policy invoices_read on public.invoices for select to authenticated
using((parent_id=(select auth.uid()) and private.is_approved_parent()) or private.is_admin());
create policy invoice_items_read on public.invoice_items for select to authenticated
using(exists(select 1 from public.invoices i where i.id=invoice_id and
  ((i.parent_id=(select auth.uid()) and private.is_approved_parent()) or private.is_admin())));
create policy mandates_read on public.mandates for select to authenticated
using((parent_id=(select auth.uid()) and private.is_approved_parent()) or private.is_admin());
create policy audit_read on public.audit_logs for select to authenticated using(private.is_admin());

-- Explicit grants are separate from RLS. Parent INSERT/UPDATE applies only to onboarding + acknowledgement.
grant select on public.profiles,public.enquiries,public.children,public.child_onboarding,
  public.attendance,public.incidents,public.incident_acknowledgements,public.photos,
  public.invoices,public.invoice_items,public.mandates,public.audit_logs to authenticated;
grant insert,update on public.child_onboarding to authenticated;
grant insert on public.incident_acknowledgements to authenticated;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('child-photos','child-photos',false,5242880,array['image/jpeg','image/png','image/webp'])
on conflict(id) do update set public=false,file_size_limit=5242880,
  allowed_mime_types=excluded.allowed_mime_types;
-- No authenticated storage object policies: server-side verified uploads and signed reads only.

-- Keep billing records unchanged after issue. Drafts are also append-only once generated;
-- correct incorrect attendance before generating, then void and reissue if needed.
create or replace function private.lock_invoice_items() returns trigger
language plpgsql set search_path = '' as $$
declare v_status text; v_id uuid;
begin
  if TG_OP='DELETE' then v_id := old.invoice_id; else v_id := new.invoice_id; end if;
  select status into v_status from public.invoices where id=v_id;
  if v_status is distinct from 'draft' then
    raise exception 'Cannot modify line items on an issued invoice';
  end if;
  if TG_OP='DELETE' then return old; else return new; end if;
end $$;
create trigger lock_issued_line_items before insert or update or delete on public.invoice_items
for each row execute function private.lock_invoice_items();

-- Atomic, retry-safe monthly draft generation. Only the service role may execute it.
create or replace function public.generate_invoice_drafts(p_start date,p_end date) returns integer
language plpgsql security definer set search_path = '' as $$
declare fam record; new_invoice uuid; created_count integer := 0;
begin
  if p_start is null or p_end is null or p_start>p_end
     or p_start <> date_trunc('month',p_start)::date
     or p_end <> (date_trunc('month',p_start) + interval '1 month - 1 day')::date then
    raise exception 'Expected a complete calendar month';
  end if;
  perform pg_catalog.pg_advisory_xact_lock(8327101);
  for fam in
    select distinct c.parent_id
    from public.attendance a join public.children c on c.id=a.child_id
    where a.attended_on between p_start and p_end and a.rate_pence>0
  loop
    new_invoice := null;
    insert into public.invoices(parent_id,period_start,period_end,due_on)
    values(fam.parent_id,p_start,p_end,p_end+14)
    on conflict(parent_id,period_start,period_end) do nothing
    returning id into new_invoice;
    if new_invoice is not null then
      insert into public.invoice_items(invoice_id,attendance_id,child_id,attended_on,minutes,rate_pence,amount_pence)
      select new_invoice,a.id,a.child_id,a.attended_on,a.minutes,a.rate_pence,
        pg_catalog.round((a.minutes::numeric*a.rate_pence)/60)::integer
      from public.attendance a join public.children c on c.id=a.child_id
      where c.parent_id=fam.parent_id and a.attended_on between p_start and p_end
        and a.rate_pence>0 order by a.attended_on;
      update public.invoices set total_pence=(select coalesce(sum(amount_pence),0)
        from public.invoice_items where invoice_id=new_invoice) where id=new_invoice;
      created_count := created_count + 1;
    end if;
  end loop;
  insert into public.job_heartbeats(name,last_success,details)
    values('monthly_invoices',now(),p_start::text)
    on conflict(name) do update set last_success=excluded.last_success,details=excluded.details;
  return created_count;
end $$;
revoke all on function public.generate_invoice_drafts(date,date) from public,anon,authenticated;
grant execute on function public.generate_invoice_drafts(date,date) to service_role;

create or replace function public.rebuild_invoice_draft(p_invoice_id uuid) returns integer
language plpgsql security definer set search_path = '' as $$
declare rec record; v_count integer;
begin
  perform pg_catalog.pg_advisory_xact_lock(8327101);
  select id,parent_id,period_start,period_end,status into rec
    from public.invoices where id=p_invoice_id for update;
  if not found or rec.status<>'draft' then raise exception 'Only draft invoices can be refreshed'; end if;
  delete from public.invoice_items where invoice_id=p_invoice_id;
  insert into public.invoice_items(invoice_id,attendance_id,child_id,attended_on,minutes,rate_pence,amount_pence)
    select p_invoice_id,a.id,a.child_id,a.attended_on,a.minutes,a.rate_pence,
      pg_catalog.round((a.minutes::numeric*a.rate_pence)/60)::integer
    from public.attendance a join public.children c on c.id=a.child_id
    where c.parent_id=rec.parent_id and a.attended_on between rec.period_start and rec.period_end
      and a.rate_pence>0 order by a.attended_on;
  get diagnostics v_count=row_count;
  update public.invoices set total_pence=(select coalesce(sum(amount_pence),0)
    from public.invoice_items where invoice_id=p_invoice_id) where id=p_invoice_id;
  return v_count;
end $$;
revoke all on function public.rebuild_invoice_draft(uuid) from public,anon,authenticated;
grant execute on function public.rebuild_invoice_draft(uuid) to service_role;

-- Promote a known user after they have signed up (run manually as the project owner):
-- update public.profiles set role='admin',approved=true where id='PASTE-VERIFIED-USER-UUID';
-- Admins must then set up TOTP MFA in /admin/setup-mfa.
