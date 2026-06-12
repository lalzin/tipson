-- Enable realtime
alter publication supabase_realtime add table requests;
alter publication supabase_realtime add table sessions;

-- Profiles DJ
create table profiles (
  id uuid references auth.users primary key,
  dj_name text not null default 'DJ',
  avatar_url text,
  paypal_me_url text,          -- ex: https://paypal.me/djname
  created_at timestamptz default now()
);

-- Sessions
create table sessions (
  id uuid primary key default gen_random_uuid(),
  dj_id uuid references profiles(id) not null,
  name text not null,
  code text unique not null,
  status text not null default 'active' check (status in ('active', 'paused', 'ended')),
  price_normal integer not null default 100,      -- centimes EUR (1€)
  price_priority integer not null default 500,    -- centimes EUR (5€)
  venue text,
  created_at timestamptz default now(),
  ended_at timestamptz
);

-- Requests (demandes de chansons)
create table requests (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references sessions(id) not null,
  customer_name text not null,
  song_name text not null,
  artist text not null,
  spotify_uri text,
  album_image text,
  request_type text not null check (request_type in ('normal', 'priority')),
  status text not null default 'pending_payment' check (
    status in ('pending_payment', 'paid', 'approved', 'rejected', 'played')
  ),
  amount integer not null,      -- centimes
  message text,
  created_at timestamptz default now()
);

-- Index
create index requests_session_id_idx on requests(session_id);
create index requests_status_idx on requests(status);
create index sessions_code_idx on sessions(code);
create index sessions_dj_id_idx on sessions(dj_id);

-- RLS
alter table profiles enable row level security;
alter table sessions enable row level security;
alter table requests enable row level security;

-- Profiles
create policy "profiles_own" on profiles for all using (auth.uid() = id);

-- Sessions: DJ crud, public read active
create policy "sessions_dj_crud" on sessions for all using (auth.uid() = dj_id);
create policy "sessions_public_read" on sessions for select using (status = 'active');

-- Requests: DJ peut tout voir/modifier sur ses sessions; clients peuvent lire et insérer
create policy "requests_dj_all" on requests for all
  using (exists (
    select 1 from sessions s where s.id = requests.session_id and s.dj_id = auth.uid()
  ));
create policy "requests_public_read" on requests for select using (true);
create policy "requests_public_insert" on requests for insert with check (
  exists (select 1 from sessions s where s.id = requests.session_id and s.status = 'active')
);
create policy "requests_public_update_paid" on requests for update
  using (status = 'pending_payment')
  with check (status = 'paid');

-- Auto-create profile on signup
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into profiles (id, dj_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'dj_name', split_part(new.email, '@', 1))
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ── Karaoke mode ──────────────────────────────────────────────────────────────
alter table sessions add column if not exists session_type text not null default 'dj' check (session_type in ('dj', 'karaoke'));
alter table sessions add column if not exists price_karaoke integer not null default 0;
alter table requests add column if not exists queue_position integer;

alter table sessions add column if not exists price_karaoke_priority integer not null default 0;

-- ── Rôles & accès (admin / DJ) ─────────────────────────────────────────────────
alter table profiles add column if not exists is_dj boolean not null default false;
alter table profiles add column if not exists is_admin boolean not null default false;

-- Désigner le premier admin (remplacer l'email) :
-- update profiles set is_admin = true, is_dj = true
-- where id = (select id from auth.users where email = 'votre@email.com');

-- ── Migration Stripe (remplace PayPal) ──────────────────────────────────────────
alter table requests add column if not exists stripe_payment_intent_id text;

-- ── Stripe Connect (versements aux organisateurs) ───────────────────────────────
alter table profiles add column if not exists stripe_account_id text;
alter table profiles add column if not exists charges_enabled boolean not null default false;
alter table profiles add column if not exists payouts_enabled boolean not null default false;
