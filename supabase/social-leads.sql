-- Extensão aditiva: mantém empresas, importações e histórico existentes.
begin;
create table if not exists public.lead_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) between 1 and 60),
  created_at timestamptz not null default now()
);
create unique index if not exists lead_categories_name_unique on public.lead_categories(lower(trim(name)));
alter table public.lead_categories enable row level security;
drop policy if exists lead_categories_public_all on public.lead_categories;
create policy lead_categories_public_all on public.lead_categories for all to anon, authenticated using (true) with check (true);
grant select,insert,update,delete on public.lead_categories to anon,authenticated;

alter table public.companies add column if not exists source text not null default 'spreadsheet' check (source in ('spreadsheet','whatsapp','instagram'));
alter table public.companies add column if not exists contact_queue boolean not null default false;
alter table public.companies add column if not exists lead_category_id uuid references public.lead_categories(id) on delete set null;
alter table public.companies drop constraint if exists companies_status_check;
alter table public.companies add constraint companies_status_check check (status in ('new','contacted','replied','followup','discarded','retry','negotiation','won'));
create index if not exists companies_source_idx on public.companies(source);
create index if not exists companies_contact_queue_idx on public.companies(contact_queue) where contact_queue;
create index if not exists companies_lead_category_idx on public.companies(lead_category_id);
notify pgrst, 'reload schema';
commit;
