-- ==========================================================================
-- FLIGHTSAVER DATABASE SCHEMA (SUPABASE POSTGRESQL)
-- 1. Profiles (Профили пользователей)
-- 2. Search History (История поисковых запросов к ИИ)
-- 3. Orders & Tickets (Заказы, билеты и ваучеры STPC)
-- 4. Payment Events & Webhook Idempotency (Идемпотентность Stripe/Unlimit)
-- Row Level Security (RLS) Policies & Triggers
-- ==========================================================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- 1. Профили пользователей
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  email text,
  full_name text,
  avatar_url text,
  preferred_currency text default 'RUB' check (preferred_currency in ('RUB', 'USD', 'EUR', 'VND')),
  is_club_member boolean default false,
  is_accessibility_mode boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 2. История поисковых запросов к ИИ
create table if not exists public.search_history (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  query_text text not null,
  input_mode text default 'text' check (input_mode in ('text', 'voice')),
  parsed_intent jsonb,
  created_at timestamptz default now()
);

-- 3. Заказы и билеты
create table if not exists public.orders (
  id uuid default gen_random_uuid() primary key,
  order_reference text unique,
  user_id uuid references public.profiles(id) on delete cascade,
  flight_id text not null,
  route text not null,
  airline text not null,
  departure_date date not null,
  return_date date,
  total_price numeric not null,
  original_price numeric not null,
  savings_amount numeric not null,
  currency text default 'RUB',
  service_type text default 'assistant' check (service_type in ('assistant', 'club')),
  service_fee numeric default 1500,
  fx_buffer numeric default 0,
  net_fare numeric default 0,
  stpc_hotel_included boolean default false,
  stpc_hotel_name text,
  status text default 'pending' check (status in ('pending', 'confirmed', 'completed', 'cancelled')),
  payment_method text default 'card',
  payment_intent_id text,
  stripe_session_id text,
  contact_email text,
  contact_phone text,
  passengers jsonb,
  e_ticket_number text,
  pnr text,
  receipt_url text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 4. Идемпотентность вебхуков и транзакции
create table if not exists public.payment_events (
  id uuid default gen_random_uuid() primary key,
  event_id text unique not null,
  event_type text not null,
  provider text default 'stripe' check (provider in ('stripe', 'unlimit', 'sbp')),
  order_id text,
  status text default 'processed' check (status in ('processed', 'failed', 'ignored')),
  payload jsonb,
  created_at timestamptz default now()
);

-- ==========================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==========================================================================

alter table public.profiles enable row level security;
alter table public.search_history enable row level security;
alter table public.orders enable row level security;
alter table public.payment_events enable row level security;

-- Profiles: Users can view and update only their own profile
create policy "Profiles viewable by owner" 
  on public.profiles for select 
  using (auth.uid() = id);

create policy "Profiles editable by owner" 
  on public.profiles for update 
  using (auth.uid() = id);

create policy "Profiles insertable by owner" 
  on public.profiles for insert 
  with check (auth.uid() = id);

-- Search History: Users can view, insert and delete only their own searches
create policy "Searches accessible by owner" 
  on public.search_history for all 
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Orders: Users can view, insert and update only their own orders
create policy "Orders accessible by owner" 
  on public.orders for all 
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Service role bypasses RLS for payment_events and order confirmation in webhooks

-- ==========================================================================
-- AUTOMATIC PROFILE CREATION TRIGGER ON USER SIGNUP
-- ==========================================================================

create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do update set
    email = excluded.email,
    full_name = coalesce(excluded.full_name, profiles.full_name),
    avatar_url = coalesce(excluded.avatar_url, profiles.avatar_url);
  return new;
end;
$$ language plpgsql security definer;

-- Trigger to execute upon auth.users creation
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Indexes for high performance
create index if not exists idx_search_history_user on public.search_history(user_id, created_at desc);
create index if not exists idx_orders_user on public.orders(user_id, created_at desc);
create index if not exists idx_orders_reference on public.orders(order_reference);
create index if not exists idx_payment_events_event_id on public.payment_events(event_id);
create index if not exists idx_payment_events_order on public.payment_events(order_id);
