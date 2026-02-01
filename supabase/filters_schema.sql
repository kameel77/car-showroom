-- Filter configuration tables
-- Run this in Supabase SQL Editor

-- Table for brand filters (whitelist approach)
create table if not exists public.brand_filters (
  id bigint generated always as identity primary key,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  brand_name text not null unique,
  is_active boolean default true,
  display_order integer default 0,
  notes text
);

-- Table for model filters (optional - per brand)
create table if not exists public.model_filters (
  id bigint generated always as identity primary key,
  created_at timestamp with time zone default now(),
  brand_filter_id bigint references public.brand_filters(id) on delete cascade,
  model_name text not null,
  is_active boolean default true,
  unique(brand_filter_id, model_name)
);

-- RLS policies
alter table public.brand_filters enable row level security;
alter table public.model_filters enable row level security;

create policy "Allow public select" on public.brand_filters for select using (true);
create policy "Allow public select" on public.model_filters for select using (true);
create policy "Allow public insert" on public.brand_filters for insert with check (true);
create policy "Allow public insert" on public.model_filters for insert with check (true);
create policy "Allow public update" on public.brand_filters for update using (true);
create policy "Allow public update" on public.model_filters for update using (true);
create policy "Allow public delete" on public.brand_filters for delete using (true);
create policy "Allow public delete" on public.model_filters for delete using (true);

-- Function to update updated_at
create or replace function public.update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Triggers
drop trigger if exists update_brand_filters_updated_at on public.brand_filters;
create trigger update_brand_filters_updated_at
  before update on public.brand_filters
  for each row execute function public.update_updated_at_column();

-- Get allowed brands function
create or replace function public.get_allowed_brands()
returns text[] as $$
begin
  return array(
    select brand_name 
    from public.brand_filters 
    where is_active = true
    order by display_order, brand_name
  );
end;
$$ language plpgsql;

-- Check if offer is allowed function
create or replace function public.is_offer_allowed(brand text, model text)
returns boolean as $$
declare
  brand_allowed boolean;
  model_allowed boolean;
  brand_id bigint;
begin
  -- Check if brand is in whitelist
  select exists(
    select 1 from public.brand_filters 
    where brand_name = brand and is_active = true
  ) into brand_allowed;
  
  -- If brand not in whitelist, reject
  if not brand_allowed then
    return false;
  end if;
  
  -- Get brand filter id
  select id into brand_id 
  from public.brand_filters 
  where brand_name = brand and is_active = true;
  
  -- If no model filters for this brand, allow all models
  select not exists(
    select 1 from public.model_filters 
    where brand_filter_id = brand_id
  ) into model_allowed;
  
  if model_allowed then
    return true;
  end if;
  
  -- Check if specific model is allowed
  select exists(
    select 1 from public.model_filters 
    where brand_filter_id = brand_id 
    and model_name = model 
    and is_active = true
  ) into model_allowed;
  
  return model_allowed;
end;
$$ language plpgsql;
