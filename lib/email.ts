// Emailing via Resend (API REST, sans dépendance). Configurer RESEND_API_KEY.
// L'expéditeur EMAIL_FROM doit appartenir à un domaine vérifié dans Resend
// (ex. "TIPSON <noreply@tipson.online>"). Sans domaine vérifié, Resend n'autorise
// que l'envoi depuis onboarding@resend.dev vers l'email du compte.
import { formatPrice } from '@/lib/utils'

const FROM = process.env.EMAIL_FROM || 'TIPSON <onboarding@resend.dev>'

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

// ── Gabarit de base (sombre, branding TIPSON) ───────────────────────────────
function layout(title: string, body: string): string {
  return `<!doctype html><html><body style="margin:0;background:#0a0a0f;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#e5e7eb;">
  <div style="max-width:520px;margin:0 auto;padding:32px 20px;">
    <div style="text-align:center;margin-bottom:24px;">
      <div style="display:inline-block;width:48px;height:48px;border-radius:14px;background:linear-gradient(135deg,#9333ea,#db2777);line-height:48px;text-align:center;font-weight:900;font-size:22px;color:#fff;">T</div>
      <div style="font-weight:800;letter-spacing:.04em;margin-top:8px;color:#fff;">TIPSON</div>
    </div>
    <div style="background:#13131c;border:1px solid rgba(255,255,255,.08);border-radius:20px;padding:24px;">
      <h1 style="margin:0 0 12px;font-size:20px;color:#fff;">${title}</h1>
      ${body}
    </div>
    <p style="text-align:center;color:#6b7280;font-size:12px;margin-top:20px;">TIPSON · la soirée dirigée par le public<br/>Cet email vous a été envoyé suite à votre activité sur une soirée.</p>
  </div></body></html>`
}

function row(label: string, value: string): string {
  return `<div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid rgba(255,255,255,.06);">
    <span style="color:#9ca3af;">${label}</span><span style="color:#fff;font-weight:600;">${value}</span></div>`
}

// ── Reçu client après paiement ──────────────────────────────────────────────
export function receiptHtml(p: { amountCents: number; label: string; djName?: string; sessionName?: string; date?: Date }): string {
  const d = p.date || new Date()
  const body = `
    <p style="color:#9ca3af;margin:0 0 16px;">Merci ! Voici le reçu de votre paiement.</p>
    <div style="background:#0d0d14;border-radius:14px;padding:14px 16px;margin-bottom:16px;">
      ${row('Montant', `<span style="color:#34d399;">${formatPrice(p.amountCents)}</span>`)}
      ${row('Objet', p.label)}
      ${p.sessionName ? row('Soirée', p.sessionName) : ''}
      ${p.djName ? row('Organisateur', p.djName) : ''}
      ${row('Date', d.toLocaleString('fr-FR', { dateStyle: 'long', timeStyle: 'short' }))}
    </div>
    <p style="color:#6b7280;font-size:13px;margin:0;">Paiement traité de façon sécurisée par Stripe.</p>`
  return layout('Reçu de paiement', body)
}

// ── Récap de soirée pour le DJ ──────────────────────────────────────────────
export function recapHtml(p: {
  djName?: string; sessionName: string
  revenueCents: number; played: number; requests: number
  topTracks?: { song: string; artist: string; count: number }[]
}): string {
  const top = (p.topTracks || []).slice(0, 5)
    .map((t, i) => `<div style="display:flex;gap:10px;padding:6px 0;"><span style="color:#6b7280;width:18px;">${i + 1}</span><span style="color:#fff;flex:1;">${escapeHtml(t.song)} <span style="color:#9ca3af;">· ${escapeHtml(t.artist)}</span></span><span style="color:#9ca3af;">×${t.count}</span></div>`)
    .join('')
  const body = `
    <p style="color:#9ca3af;margin:0 0 16px;">Votre soirée <strong style="color:#fff;">${escapeHtml(p.sessionName)}</strong> est terminée. Voici le bilan.</p>
    <div style="background:#0d0d14;border-radius:14px;padding:14px 16px;margin-bottom:16px;">
      ${row('Revenus', `<span style="color:#34d399;">${formatPrice(p.revenueCents)}</span>`)}
      ${row('Sons joués', String(p.played))}
      ${row('Demandes', String(p.requests))}
    </div>
    ${top ? `<p style="color:#9ca3af;font-size:13px;margin:0 0 6px;">Sons les plus demandés</p><div style="background:#0d0d14;border-radius:14px;padding:8px 16px;">${top}</div>` : ''}
    <p style="color:#6b7280;font-size:13px;margin:16px 0 0;">Merci d'avoir animé avec TIPSON 🎶</p>`
  return layout('Bilan de soirée', body)
}

function escapeHtml(s: string): string {
  return String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c] as string))
}
