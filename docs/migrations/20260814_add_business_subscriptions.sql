begin;

create table if not exists businesses (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  contact_email text not null,
  status text not null default 'pending' check (status in ('draft','pending','active','suspended')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (char_length(name) between 2 and 120),
  check (char_length(contact_email) <= 254)
);

create table if not exists business_members (
  business_id uuid not null references businesses(id) on delete cascade,
  user_id text not null references users(id) on delete cascade,
  role text not null default 'owner' check (role in ('owner','manager','staff')),
  created_at timestamptz not null default now(),
  primary key (business_id,user_id)
);
create index if not exists business_members_user_idx on business_members(user_id);

create table if not exists business_venues (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  name text not null,
  category text not null check (category in ('cafe','restaurant','bar','activity','culture','wellness','other')),
  address_line text not null,
  city text not null,
  postcode text not null,
  status text not null default 'pending' check (status in ('pending','active','paused')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (char_length(name) between 2 and 120),
  check (char_length(address_line) <= 200),
  check (char_length(city) <= 100),
  check (char_length(postcode) <= 16)
);
create index if not exists business_venues_business_idx on business_venues(business_id);

create table if not exists business_offers (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  venue_id uuid not null references business_venues(id) on delete cascade,
  title text not null,
  description text,
  discount_type text not null check (discount_type in ('percentage','fixed')),
  discount_value numeric(10,2) not null check (discount_value > 0),
  terms text,
  starts_at timestamptz,
  ends_at timestamptz,
  active boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (char_length(title) between 2 and 120),
  check (description is null or char_length(description) <= 500),
  check (terms is null or char_length(terms) <= 500),
  check (discount_type<>'percentage' or discount_value<=100),
  check (ends_at is null or starts_at is null or ends_at>starts_at)
);
create index if not exists business_offers_business_idx on business_offers(business_id,created_at desc);

create table if not exists business_subscriptions (
  stripe_subscription_id text primary key,
  business_id uuid not null references businesses(id) on delete cascade,
  stripe_customer_id text not null,
  plan text not null check (plan in ('standard','featured')),
  subscription_status text not null,
  cancel_at_period_end boolean not null default false,
  current_period_start timestamptz,
  current_period_end timestamptz,
  canceled_at timestamptz,
  latest_invoice_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists business_subscriptions_business_idx on business_subscriptions(business_id);

alter table businesses enable row level security;
alter table business_members enable row level security;
alter table business_venues enable row level security;
alter table business_offers enable row level security;
alter table business_subscriptions enable row level security;

do $$ begin
  revoke all on table businesses,business_members,business_venues,business_offers,business_subscriptions from anon,authenticated;
exception when undefined_object then null;
end $$;

commit;
