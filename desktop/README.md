# TIPSON Studio (app desktop)

Visualiseur de soirée **TIPSON** pour Mac & Windows : moteur **Milkdrop/projectM**
(via Butterchurn, WebGL) réactif au son, avec l'**overlay TIPSON** (messages, son
joué, emojis, votes) par-dessus, et un **link platine Pro DJ Link** (Phase 3).

## Architecture
- **Electron** (process principal) : fenêtre, plein écran, et accès réseau pour la
  platine (`src/main/prolink.ts`, Phase 3 — `prolink-connect`).
- **Renderer (React + Vite)** :
  - `visual/butterchurn.ts` : moteur Milkdrop (WebGL), presets.
  - `visual/audio.ts` : source de réactivité — **ligne** (interface USB / booth),
    **micro** (ambiant), ou **beat seul** (pulse synthétisée, BPM/Pro DJ Link).
  - `components/Overlay.tsx` : éléments TIPSON via Supabase Realtime (mêmes canaux
    que l'écran web `/display/[id]`).
  - `components/Settings.tsx` : sélecteur de source audio, presets, toggles, link platine.
- **Interface tipson.online** : auth Supabase (mêmes comptes), résolution du code
  de soirée via l'API publique, temps réel via Supabase.

## Démarrage
```bash
cd desktop
cp .env.example .env      # renseigner VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY
npm install
npm run dev               # lance l'app en dev
npm run build             # build de production (out/)
```

## Capture audio (terrain)
- **Concert / XLR façade** : prendre un départ **booth/aux** → petite **interface
  audio USB** (la XDJ-RX3 est elle-même une interface USB) → mode « Ligne ».
- **Sans câblage** : mode « Micro » (ambiant).
- **Sans audio** : mode « Beat seul » (pulse au tempo ; synchronisé par Pro DJ Link en Phase 3).

## Roadmap
- **Phase 1-2 (faite)** : app + login + code + Butterchurn + sélecteur audio + overlay.
- **Phase 3** : `prolink-connect` dans `src/main/prolink.ts` → BPM/beat/morceau réels
  (à tester sur la platine).
- **Phase 4** : `electron-builder` (installeurs signés), auto-update, deep-link OAuth Google.
