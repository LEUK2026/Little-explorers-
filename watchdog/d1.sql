create table if not exists checks (
  name text primary key,
  state text not null check(state in ('operational','degraded','down')),
  consecutive_failures integer not null default 0,
  checked_at text not null
);
create table if not exists history (
  id integer primary key autoincrement,
  name text not null,
  state text not null,
  checked_at text not null
);
create index if not exists history_name_time on history(name,checked_at desc);
create table if not exists incidents (
  id integer primary key autoincrement,
  name text not null,
  opened_at text not null,
  resolved_at text
);
