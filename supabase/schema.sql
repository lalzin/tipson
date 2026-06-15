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

-- ── Mode express activable/désactivable par session ─────────────────────────────
alter table sessions add column if not exists express_enabled boolean not null default true;

-- ── Liens multi-plateformes (Deezer/Apple/Spotify via Odesli song.link) ─────────
alter table requests add column if not exists itunes_url text;
alter table requests add column if not exists music_links jsonb;

-- ── Mode visualisation / interactions écran (beta) ──────────────────────────────
alter table sessions add column if not exists display_enabled boolean not null default false;
alter table sessions add column if not exists messages_enabled boolean not null default false;
alter table sessions add column if not exists super_messages_enabled boolean not null default false;
alter table sessions add column if not exists price_super_message integer not null default 200;
alter table sessions add column if not exists display_bg text not null default 'waves';

create table if not exists messages (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references sessions(id) on delete cascade not null,
  text text not null,
  author_name text,
  is_super boolean not null default false,
  amount integer not null default 0,
  stripe_payment_intent_id text,
  created_at timestamptz default now()
);
create index if not exists messages_session_idx on messages(session_id);
alter table messages enable row level security;
-- Lecture publique (écran d'affichage anon) ; insertions via service client (modération serveur)
create policy "messages_public_read" on messages for select using (true);
alter publication supabase_realtime add table messages;

-- ── Seuil de toxicité (Perspective API) par session ─────────────────────────────
alter table sessions add column if not exists toxicity_threshold integer not null default 70;

-- ── Affichage configurable des infos sur l'écran ────────────────────────────────
alter table sessions add column if not exists display_show_dj boolean not null default true;
alter table sessions add column if not exists display_show_venue boolean not null default true;

-- ── Liste noire de morceaux (prix premium) ──────────────────────────────────────
alter table sessions add column if not exists price_blacklist integer not null default 1000; -- 10€

create table if not exists blacklist_tracks (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references sessions(id) on delete cascade not null,
  itunes_id text not null,
  name text not null,
  artist text not null,
  image text,
  created_at timestamptz default now(),
  unique (session_id, itunes_id)
);
create index if not exists blacklist_session_idx on blacklist_tracks(session_id);
alter table blacklist_tracks enable row level security;
create policy "blacklist_public_read" on blacklist_tracks for select using (true);

-- request_type : ajout de 'blacklist'
alter table requests drop constraint if exists requests_request_type_check;
alter table requests add constraint requests_request_type_check
  check (request_type in ('normal', 'priority', 'karaoke', 'blacklist'));

-- ── Codes promo à usage unique (mode express gratuit) ───────────────────────────
create table if not exists promo_codes (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references sessions(id) on delete cascade not null,
  code text not null,
  used boolean not null default false,
  used_at timestamptz,
  created_at timestamptz default now(),
  unique (session_id, code)
);
create index if not exists promo_session_idx on promo_codes(session_id);
alter table promo_codes enable row level security;
-- Pas de policy de lecture publique : tout passe par le service client (sécurité).
