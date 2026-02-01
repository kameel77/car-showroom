-- Settings table for application configuration
-- Run this in Supabase SQL Editor

create table if not exists public.app_settings (
  id bigint generated always as identity primary key,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  
  -- Branding
  site_name text default 'CarShowroom',
  logo_url text,
  favicon_url text,
  
  -- Currency
  default_currency text default 'PLN',
  exchange_rate_eur numeric default 4.5, -- 1 EUR = 4.5 PLN
  show_eur_prices boolean default true,
  
  -- Contact
  contact_phone text,
  contact_email text,
  show_contact_buttons boolean default true,
  
  -- Dealer info visibility
  show_dealer_info boolean default true,
  show_dealer_name boolean default true,
  show_dealer_address boolean default true,
  show_dealer_rating boolean default false,
  
  -- Features
  enable_financing_calculator boolean default false,
  enable_contact_form boolean default true,
  enable_whatsapp_button boolean default false,
  
  -- SEO
  meta_title text,
  meta_description text,
  og_image_url text
);

-- Insert default settings if table is empty
insert into public.app_settings (
  site_name,
  logo_url,
  default_currency,
  exchange_rate_eur,
  show_eur_prices,
  contact_phone,
  contact_email,
  show_contact_buttons,
  show_dealer_info,
  show_dealer_name,
  show_dealer_address,
  show_dealer_rating
)
select 
  'CarShowroom',
  null,
  'PLN',
  4.5,
  true,
  '+48 123 456 789',
  'kontakt@carshowroom.pl',
  true,
  true,
  true,
  true,
  false
where not exists (select 1 from public.app_settings);

-- Create index for faster lookups
create index if not exists idx_app_settings_id on public.app_settings(id);

-- RLS policies
alter table public.app_settings enable row level security;

create policy "Allow public select" 
on public.app_settings for select using (true);

create policy "Allow public update" 
on public.app_settings for update using (true);

create policy "Allow public insert" 
on public.app_settings for insert with check (true);

-- Function to update updated_at timestamp
create or replace function public.update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Trigger to automatically update updated_at
drop trigger if exists update_app_settings_updated_at on public.app_settings;
create trigger update_app_settings_updated_at
  before update on public.app_settings
  for each row
  execute function public.update_updated_at_column();
