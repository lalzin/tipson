// Emailing via Resend (API REST, sans dépendance). Configurer RESEND_API_KEY.
// L'expéditeur EMAIL_FROM doit appartenir à un domaine vérifié dans Resend
// (ex. "TIPSON <noreply@tipson.online>"). Sans domaine vérifié, Resend n'autorise
// que l'envoi depuis onboarding@resend.dev vers l'email du compte.
import { formatPrice } from '@/lib/utils'

const FROM = process.env.EMAIL_FROM || 'TIPSON <onboarding@resend.dev>'

// Base URL publique (pour le logo hébergé dans les emails)
const APP_URL = (() => {
  const e = process.env.NEXT_PUBLIC_APP_URL
  if (e && !/localhost|127\.0\.0\.1/.test(e)) return e.replace(/\/$/, '')
  return 'https://www.tipson.online'
})()

export async function sendEmail(opts: { to: string; subject: string; html: string }): Promise<boolean> {
  const key = process.env.RESEND_API_KEY
  if (!key || !opts.to) return false
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
      body: JSON.stringify({ from: FROM, to: opts.to, subject: opts.subject, html: opts.html }),
    })
    if (!res.ok) console.error('Resend error:', res.status, await res.text().catch(() => ''))
    return res.ok
  } catch (e) {
    console.error('Resend network error:', e)
    return false
  }
}

// ── Gabarit « after-dark » (assorti à la landing : néon fuchsia→cyan) ────────
// Layout en tables + styles inline pour la compatibilité clients mail.
function layout(opts: { eyebrow: string; title: string; body: string; cta?: { label: string; href: string } }): string {
  const cta = opts.cta ? `
    <tr><td style="padding:8px 0 4px;">
      <a href="${opts.cta.href}" style="display:inline-block;background:#d946ef;background-image:linear-gradient(135deg,#d946ef,#22d3ee);color:#06060b;font-weight:700;text-decoration:none;padding:12px 22px;border-radius:14px;font-size:14px;">${opts.cta.label}</a>
    </td></tr>` : ''
  return `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="dark"></head>
  <body style="margin:0;padding:0;background:#06060b;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#06060b;background-image:radial-gradient(900px 400px at 50% -120px, rgba(217,70,239,.18), transparent), radial-gradient(700px 360px at 100% 0%, rgba(34,211,238,.12), transparent);">
    <tr><td align="center" style="padding:36px 16px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;">
        <!-- en-tête logo -->
        <tr><td align="center" style="padding-bottom:22px;">
          <img src="${APP_URL}/icon-192.png" width="46" height="46" alt="TIPSON" style="display:inline-block;border-radius:14px;vertical-align:middle;">
          <span style="font-family:'Trebuchet MS',Helvetica,Arial,sans-serif;font-weight:800;font-size:20px;letter-spacing:.14em;color:#ffffff;vertical-align:middle;margin-left:10px;">TIPSON</span>
        </td></tr>
        <!-- carte -->
        <tr><td style="background:#0f0f17;border:1px solid rgba(255,255,255,.08);border-radius:22px;padding:28px 26px;">
          <div style="font-size:11px;letter-spacing:.28em;text-transform:uppercase;font-weight:700;color:#d946ef;margin-bottom:10px;">${opts.eyebrow}</div>
          <h1 style="margin:0 0 16px;font-family:'Trebuchet MS',Helvetica,Arial,sans-serif;font-size:24px;line-height:1.2;color:#ffffff;">${opts.title}</h1>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="color:#cbd5e1;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;font-size:15px;">
            ${opts.body}
            ${cta}
          </table>
        </td></tr>
        <!-- pied -->
        <tr><td align="center" style="padding-top:20px;">
          <div style="font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;font-size:12px;color:#6b7280;line-height:1.6;">
            <span style="color:#9ca3af;">TIPSON</span> · la nuit appartient à la foule<br/>
            <a href="${APP_URL}" style="color:#a78bfa;text-decoration:none;">www.tipson.online</a>
          </div>
        </td></tr>
      </table>
    </td></tr>
  </table></body></html>`
}

function row(label: string, value: string): string {
  return `<tr>
    <td style="padding:9px 0;border-bottom:1px solid rgba(255,255,255,.07);color:#94a3b8;">${label}</td>
    <td align="right" style="padding:9px 0;border-bottom:1px solid rgba(255,255,255,.07);color:#ffffff;font-weight:600;">${value}</td>
  </tr>`
}
function card(rowsHtml: string): string {
  return `<tr><td colspan="2" style="padding:4px 0 14px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a12;border-radius:14px;padding:6px 16px;">${rowsHtml}</table>
  </td></tr>`
}
function para(text: string): string {
  return `<tr><td colspan="2" style="padding:0 0 14px;color:#cbd5e1;line-height:1.6;">${text}</td></tr>`
}

// ── Reçu client après paiement ──────────────────────────────────────────────
export function receiptHtml(p: { amountCents: number; label: string; djName?: string; sessionName?: string; date?: Date }): string {
  const d = p.date || new Date()
  const body =
    para('Merci pour votre participation 🎶 Voici le reçu de votre paiement.') +
    card(
      row('Montant', `<span style="color:#34d399;">${formatPrice(p.amountCents)}</span>`) +
      row('Objet', escapeHtml(p.label)) +
      (p.sessionName ? row('Soirée', escapeHtml(p.sessionName)) : '') +
      (p.djName ? row('Organisateur', escapeHtml(p.djName)) : '') +
      row('Date', d.toLocaleString('fr-FR', { dateStyle: 'long', timeStyle: 'short' }))
    ) +
    para('<span style="color:#6b7280;font-size:13px;">Paiement traité de façon sécurisée par Stripe.</span>')
  return layout({ eyebrow: 'Reçu', title: 'C\'est noté, merci !', body })
}

// ── Récap de soirée pour le DJ ──────────────────────────────────────────────
export function recapHtml(p: {
  djName?: string; sessionName: string
  revenueCents: number; played: number; requests: number
  topTracks?: { song: string; artist: string; count: number }[]
}): string {
  const topRows = (p.topTracks || []).slice(0, 5)
    .map((t, i) => row(`<span style="color:#6b7280;">${i + 1}.</span> ${escapeHtml(t.song)} <span style="color:#94a3b8;">· ${escapeHtml(t.artist)}</span>`, `×${t.count}`))
    .join('')
  const body =
    para(`Votre soirée <strong style="color:#fff;">${escapeHtml(p.sessionName)}</strong> est terminée. Voici le bilan.`) +
    card(
      row('Revenus', `<span style="color:#34d399;">${formatPrice(p.revenueCents)}</span>`) +
      row('Sons joués', String(p.played)) +
      row('Demandes', String(p.requests))
    ) +
    (topRows ? para('<span style="color:#94a3b8;font-size:13px;">Sons les plus demandés</span>') + card(topRows) : '') +
    para('<span style="color:#6b7280;font-size:13px;">Merci d\'avoir animé avec TIPSON 🎶</span>')
  return layout({ eyebrow: 'Bilan', title: 'Votre soirée en chiffres', body, cta: { label: 'Créer une nouvelle soirée', href: APP_URL + '/dj/dashboard' } })
}

function escapeHtml(s: string): string {
  return String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c] as string))
}
