# TIPSON — Guide de déploiement

## Stack
- **Frontend/Backend**: Next.js 14 (App Router) → Vercel
- **Base de données + Auth + Realtime**: Supabase
- **Recherche musicale**: Spotify Web API
- **Paiements**: PayPal.me (redirect, sans API)

---

## 1. Supabase

1. Créez un projet sur [supabase.com](https://supabase.com)
2. Dans **SQL Editor**, exécutez le contenu de `supabase/schema.sql`
3. Dans **Project Settings → API**, copiez :
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` → `SUPABASE_SERVICE_ROLE_KEY`
4. Dans **Authentication → URL Configuration** :
   - Site URL: `https://votre-app.vercel.app`
   - Redirect URLs: `https://votre-app.vercel.app/dj/dashboard`

---

## 2. Spotify API

1. Allez sur [developer.spotify.com](https://developer.spotify.com/dashboard)
2. Créez une app (type: Web API)
3. Copiez **Client ID** → `SPOTIFY_CLIENT_ID`
4. Copiez **Client Secret** → `SPOTIFY_CLIENT_SECRET`

> Pas de login utilisateur requis — on utilise le flux "Client Credentials".

---

## 3. Vercel

1. `npm i` puis `git init && git add . && git commit -m "init"`
2. Poussez sur GitHub
3. Importez le repo sur [vercel.com](https://vercel.com)
4. Ajoutez toutes les variables d'environnement (voir `.env.example`)
5. Déployez

---

## 4. Configuration DJ

1. Allez sur `/dj` → connectez-vous avec votre email (lien magique)
2. Allez dans **Paramètres** → renseignez votre lien PayPal.me
   - Format: `paypal.me/VotreNom` ou simplement `VotreNom`
3. Créez une première session → partagez le code 6 lettres aux clients

---

## Flux client

```
/join → entrer code → /session/[id]
  → recherche Spotify → choisir chanson
  → choisir option (normal 2€ / priorité 5€)
  → renseigner prénom + message
  → redirection PayPal.me/MONTANT
  → "J'ai payé" → demande confirmée
```

## Flux DJ (desktop recommandé)

```
/dj/dashboard → créer session → /dj/session/[id]
  → voir demandes en temps réel
  → Valider ✓ ou Refuser ✗
  → Marquer comme jouée ▶
```

---

## Tarifs par défaut (modifiables par session)
- **Dans la playlist**: 1€
- **La chanson maintenant** (priorité): 5€
