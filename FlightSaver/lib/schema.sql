-- ==========================================================================
-- FLIGHTSAVER DATABASE SCHEMA (SUPABASE POSTGRESQL)
-- 1. Profiles (Профили пользователей)
-- 2. Search History (История поисковых запросов к ИИ)
-- 3. Orders & Tickets (Заказы, билеты и ваучеры STPC)
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
  preferred_currency text default 'RUB' check (preferred_currency in ('RUB', 'USD', 'EUR')),
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
  user_id uuid references public.profiles(id) on delete cascade not null,
  flight_id text not null,
  route text not null,
  airline text not null,
  departure_date date not null,
  total_price numeric not null,
  original_price numeric not null,
  savings_amount numeric not null,
  stpc_hotel_included boolean default false,
  status text default 'confirmed' check (status in ('pending', 'confirmed', 'completed', 'cancelled')),
  passengers jsonb,
  e_ticket_number text,
  created_at timestamptz default now()
);

-- ==========================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==========================================================================

alter table public.profiles enable row level security;
alter table public.search_history enable row level security;
alter table public.orders enable row level security;

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
