// Thèmes prédéfinis pour le mode visualisation. Sélectionner un thème applique
// son fond, ses couleurs et ses emojis aux champs de la session (modifiables ensuite).

export type DisplayBg = 'waves' | 'pulse' | 'particles' | 'aurora' | 'neon' | 'mesh' | 'rays' | 'bokeh' | 'equalizer' | 'confetti'

export const BG_OPTIONS: { id: DisplayBg; name: string }[] = [
  { id: 'mesh', name: 'Mesh liquide' },
  { id: 'waves', name: 'Vagues' },
  { id: 'aurora', name: 'Aurore' },
  { id: 'rays', name: 'Rayons club' },
  { id: 'bokeh', name: 'Lumières (bokeh)' },
  { id: 'equalizer', name: 'Équaliseur' },
  { id: 'confetti', name: 'Confettis' },
  { id: 'neon', name: 'Néon synthwave' },
  { id: 'pulse', name: 'Pulse' },
  { id: 'particles', name: 'Particules' },
]

export interface DisplayTheme {
  id: string
  name: string
  bg: DisplayBg
  c1: string
  c2: string
  emojis: string[]
}

export const DISPLAY_THEMES: DisplayTheme[] = [
  { id: 'default',      name: 'Classique',     bg: 'mesh',      c1: '#a855f7', c2: '#ec4899', emojis: ['❤️', '👍', '🔥', '⭐', '👏'] },
  { id: 'eighties',     name: 'Années 80',     bg: 'neon',      c1: '#ff2bd6', c2: '#22d3ee', emojis: ['🕺', '💖', '🎸', '🌈', '⚡'] },
  { id: 'twothousands', name: 'Années 2000',   bg: 'bokeh',     c1: '#22d3ee', c2: '#f472b6', emojis: ['💿', '😎', '📱', '✨', '💫'] },
  { id: 'wedding',      name: 'Mariage',       bg: 'confetti',  c1: '#f9a8d4', c2: '#fcd34d', emojis: ['💍', '🤍', '🥂', '💐', '😍'] },
  { id: 'club',         name: 'Club',          bg: 'rays',      c1: '#7c3aed', c2: '#06b6d4', emojis: ['🔥', '🙌', '🎶', '💥', '🥵'] },
  { id: 'tropical',     name: 'Tropical',      bg: 'aurora',    c1: '#f59e0b', c2: '#10b981', emojis: ['🌴', '🍹', '🌺', '😎', '🦩'] },
  { id: 'concert',      name: 'Concert',       bg: 'equalizer', c1: '#ef4444', c2: '#f59e0b', emojis: ['🤘', '🎶', '🔥', '🙌', '🥁'] },
]

// Palette d'emojis proposée dans l'éditeur
export const EMOJI_PALETTE = [
  '❤️', '👍', '🔥', '⭐', '👏', '💖', '🎉', '😍', '🕺', '💃', '🥂', '💍',
  '🤍', '🌈', '⚡', '✨', '💫', '😎', '🎸', '🎶', '🙌', '💯', '🍾', '🎊',
  '🌴', '🍹', '🌺', '🦩', '💥', '🥵', '💿', '📱',
]

export const DEFAULT_EMOJIS = ['❤️', '👍', '🔥', '⭐', '👏']

export function displayColors(session: any): { c1: string; c2: string } {
  return { c1: session?.display_color1 || '#a855f7', c2: session?.display_color2 || '#ec4899' }
}

export function displayEmojis(session: any): string[] {
  const raw = session?.display_emojis
  if (raw) {
    const arr = String(raw).split(',').map((s: string) => s.trim()).filter(Boolean)
    if (arr.length) return arr.slice(0, 8)
  }
  return DEFAULT_EMOJIS
}
