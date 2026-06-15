# Mode Jukebox — configuration

Le mode Jukebox laisse les clients ajouter des morceaux à la file qui passe sur
**Apple Music**, via un pont 100 % côté navigateur (MusicKit JS) dans le tableau de
bord de l'établissement. **Le backend ne touche jamais Apple Music** : il ne gère
que la file interne (Supabase). Le dashboard écoute la file en Realtime et appelle
`music.playNext({ song: trackId })`.

## Architecture
1. Client → recherche (iTunes/Apple catalog) → `POST /api/sessions/[id]/jukebox/add`
   → insère une demande `request_type='jukebox'`, `status='paid'`, `spotify_uri=<trackId Apple>`.
2. Dashboard session (`/dj/session/[id]`, type jukebox) → `JukeboxBridge` :
   - charge MusicKit JS, configure avec le **developer token Apple Music**,
   - l'établissement se connecte à son compte Apple Music (`music.authorize()`),
   - sur chaque nouvelle demande `paid` → `music.playNext({ song: trackId })`,
   - puis passe la demande en `status='approved'` (envoyée à la file Apple Music).

> Le `trackId` iTunes correspond à l'identifiant catalogue Apple Music → utilisable
> directement avec MusicKit, aucune résolution serveur nécessaire.

## Pré-requis
- **Compte Apple Developer** (99 $/an) pour générer un *MusicKit developer token*
  (JWT ES256 signé avec une clé MediaServices `.p8`).
- L'établissement doit avoir un **abonnement Apple Music** et garder le tableau de
  bord ouvert + un appareil Apple Music actif pendant la soirée.

## Variable d'environnement (Vercel + .env.local)
```
NEXT_PUBLIC_APPLE_MUSIC_TOKEN=<developer token JWT Apple Music>
```
Sans cette variable, le mode Jukebox reste utilisable côté client (ajout à la file
interne) mais le pont affiche « Intégration Apple Music non configurée ».

## Migrations SQL (déjà dans supabase/schema.sql)
- `sessions.session_type` accepte `'jukebox'`
- `requests.request_type` accepte `'jukebox'`
- colonnes `profiles.spotify_*` (réservées pour un futur pont Spotify Web Playback)
