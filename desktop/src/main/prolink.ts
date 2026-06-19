// ── Pont Pro DJ Link (Phase 3) ───────────────────────────────────────────────
// Squelette : à brancher sur `prolink-connect` pour lire la XDJ-RX3 / CDJ sur le
// réseau local (BPM, phase de beat, deck master, morceau en cours). Le process
// principal Electron a l'accès UDP requis (impossible depuis un navigateur).
//
// Pour l'implémentation réelle :
//   npm i prolink-connect
//   import { bringOnline } from 'prolink-connect'
//   const network = await bringOnline(); network.deviceManager.on('connected', …)
//   network.statusEmitter.on('status', s => onStatus({ bpm: s.trackBPM, beat: s.beat, … }))
//
// Tant que ce n'est pas branché (et testé sur ta platine), on expose une API
// inerte + un mode "métronome" optionnel piloté côté renderer.

export interface ProlinkStatus {
  connected: boolean
  bpm?: number
  beat?: number // 1..4 phase de mesure
  isMaster?: boolean
  track?: { title?: string; artist?: string; artwork?: string }
}

let running = false

export async function startProlink(onStatus: (s: ProlinkStatus) => void): Promise<{ ok: boolean; reason?: string }> {
  if (running) return { ok: true }
  // TODO Phase 3 : initialiser prolink-connect ici et émettre onStatus(...) en temps réel.
  running = true
  onStatus({ connected: false }) // pas encore implémenté côté natif
  return { ok: false, reason: 'Pro DJ Link non encore implémenté (Phase 3, à tester sur la platine).' }
}

export function stopProlink(): void {
  running = false
}
