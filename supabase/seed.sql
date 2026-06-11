-- ============================================================
-- TIPSON — Seed de développement
-- Exécuter dans Supabase SQL Editor APRÈS schema.sql
-- ============================================================

-- 1. Crée un utilisateur de test dans auth.users
-- (mot de passe: testdj123)
INSERT INTO auth.users (
  id,
  instance_id,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  raw_app_meta_data,
  raw_user_meta_data,
  is_super_admin,
  role,
  aud
) VALUES (
  'a0000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000000',
  'dj@test.com',
  crypt('testdj123', gen_salt('bf')),
  now(),
  now(),
  now(),
  '{"provider":"email","providers":["email"]}',
  '{"dj_name":"DJ Shadow"}',
  false,
  'authenticated',
  'authenticated'
) ON CONFLICT (id) DO NOTHING;

-- 2. Profil DJ
INSERT INTO profiles (id, dj_name, paypal_me_url)
VALUES (
  'a0000000-0000-0000-0000-000000000001',
  'DJ Shadow',
  'https://paypal.me/djshadowtest'
) ON CONFLICT (id) DO UPDATE SET
  dj_name = 'DJ Shadow',
  paypal_me_url = 'https://paypal.me/djshadowtest';

-- 3. Sessions mock
INSERT INTO sessions (id, dj_id, name, code, status, price_normal, price_priority, venue, created_at)
VALUES
  -- Session active (pour tester le flow en temps réel)
  (
    'b0000000-0000-0000-0000-000000000001',
    'a0000000-0000-0000-0000-000000000001',
    'Soirée Rooftop — Vendredi',
    'TEST01',
    'active',
    100, 500,
    'Le Rex Club, Paris',
    now() - interval '2 hours'
  ),
  -- Session en pause
  (
    'b0000000-0000-0000-0000-000000000002',
    'a0000000-0000-0000-0000-000000000001',
    'Club Night Samedi',
    'TEST02',
    'paused',
    100, 500,
    'Concrete, Paris',
    now() - interval '1 day'
  ),
  -- Session terminée (pour tester les stats)
  (
    'b0000000-0000-0000-0000-000000000003',
    'a0000000-0000-0000-0000-000000000001',
    'Anniversaire Julie',
    'TEST03',
    'ended',
    100, 500,
    'Salle privée',
    now() - interval '3 days'
  )
ON CONFLICT (id) DO NOTHING;

-- 4. Demandes mock dans la session active
INSERT INTO requests (
  id, session_id, customer_name, song_name, artist,
  album_image, request_type, status, amount, message, created_at
) VALUES
  -- À valider — priorité (doit sauter aux yeux du DJ)
  (
    'c0000000-0000-0000-0000-000000000001',
    'b0000000-0000-0000-0000-000000000001',
    'Lucas', 'Blinding Lights', 'The Weeknd',
    'https://i.scdn.co/image/ab67616d0000b273ef017e899c0547766997d874',
    'priority', 'paid', 500,
    'Pour ma copine Camille, son son préféré !!',
    now() - interval '3 minutes'
  ),
  -- À valider — normale
  (
    'c0000000-0000-0000-0000-000000000002',
    'b0000000-0000-0000-0000-000000000001',
    'Sarah', 'Levitating', 'Dua Lipa',
    'https://i.scdn.co/image/ab67616d0000b273bd26ede1ae69327010d49946',
    'normal', 'paid', 100,
    null,
    now() - interval '8 minutes'
  ),
  -- À valider — priorité
  (
    'c0000000-0000-0000-0000-000000000003',
    'b0000000-0000-0000-0000-000000000001',
    'Tom', 'One More Time', 'Daft Punk',
    'https://i.scdn.co/image/ab67616d0000b27387b0b8d0f5ad4f4a11a9b9f4',
    'priority', 'paid', 500,
    'CLASSIC !!',
    now() - interval '12 minutes'
  ),
  -- Validée (approuvée, pas encore jouée)
  (
    'c0000000-0000-0000-0000-000000000004',
    'b0000000-0000-0000-0000-000000000001',
    'Emma', 'As It Was', 'Harry Styles',
    'https://i.scdn.co/image/ab67616d0000b2732e8ed79e177ff6011076f5f0',
    'normal', 'approved', 100,
    null,
    now() - interval '20 minutes'
  ),
  -- Déjà jouée
  (
    'c0000000-0000-0000-0000-000000000005',
    'b0000000-0000-0000-0000-000000000001',
    'Alex', 'Roses', 'SAINt JHN',
    'https://i.scdn.co/image/ab67616d0000b273e2e352d89826aef6dbd5ff8f',
    'priority', 'played', 500,
    null,
    now() - interval '45 minutes'
  ),
  -- Refusée
  (
    'c0000000-0000-0000-0000-000000000006',
    'b0000000-0000-0000-0000-000000000001',
    'Marie', 'Gangnam Style', 'PSY',
    null,
    'normal', 'rejected', 100,
    'Ambiance soirée chic svp 🙏',
    now() - interval '50 minutes'
  )
ON CONFLICT (id) DO NOTHING;

-- 5. Demandes dans la session terminée (pour les stats)
INSERT INTO requests (
  id, session_id, customer_name, song_name, artist,
  request_type, status, amount, created_at
) VALUES
  ('c0000000-0000-0000-0000-000000000010', 'b0000000-0000-0000-0000-000000000003', 'Paul', 'Starboy', 'The Weeknd', 'played', 'played', 500, now() - interval '3 days'),
  ('c0000000-0000-0000-0000-000000000011', 'b0000000-0000-0000-0000-000000000003', 'Clara', 'Bad Guy', 'Billie Eilish', 'normal', 'played', 100, now() - interval '3 days'),
  ('c0000000-0000-0000-0000-000000000012', 'b0000000-0000-0000-0000-000000000003', 'Hugo', 'Industry Baby', 'Lil Nas X', 'priority', 'played', 500, now() - interval '3 days'),
  ('c0000000-0000-0000-0000-000000000013', 'b0000000-0000-0000-0000-000000000003', 'Lisa', 'Heat Waves', 'Glass Animals', 'normal', 'played', 100, now() - interval '3 days'),
  ('c0000000-0000-0000-0000-000000000014', 'b0000000-0000-0000-0000-000000000003', 'Marc', 'Save Your Tears', 'The Weeknd', 'priority', 'played', 500, now() - interval '3 days')
ON CONFLICT (id) DO NOTHING;
