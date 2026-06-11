# TIPSON — Roadmap

## 💳 Architecture des paiements (à faire plus tard)

### État actuel (v1)
- Tous les paiements arrivent sur **un seul compte PayPal central** (identifiants `PAYPAL_CLIENT_ID` / `PAYPAL_CLIENT_SECRET` de l'app).
- Le champ `profiles.paypal_me_url` existe mais **n'est pas utilisé** dans le flux de paiement.
- Flux PayPal : `intent: CAPTURE` immédiat, puis remboursement si le DJ refuse.

### TODO 1 — Destination de paiement configurable par utilisateur
Permettre de choisir, **par organisateur**, où vont les pourboires :
- [ ] Option A : versement **direct au DJ** (PayPal Payee / Stripe Connect destination)
- [ ] Option B : **compte central** (défaut)
- [ ] Réglage dans les paramètres DJ + champ en base (`payout_mode`, `payout_destination`)

### TODO 2 — Objectif final : portefeuille central + virements différés (avec commission)
Tout encaisser sur un **compte global**, puis reverser aux bénéficiaires plus tard :
- [ ] Solde par bénéficiaire (table `wallets` / `balances`)
- [ ] **Commission de plateforme** prélevée sur chaque pourboire (taux configurable)
- [ ] **Minimum de retrait** avant qu'un virement soit possible
- [ ] Système de **payouts** (PayPal Payouts API ou Stripe Connect/Transfers)
- [ ] Historique des virements + statut (en attente / envoyé / échoué)
- [ ] Conformité : KYC bénéficiaires, facturation, TVA selon le pays

### TODO 3 — Anti-perte sur remboursement (transverse, prioritaire)
Passer du modèle « capture immédiate + remboursement » à **autorisation → capture/void** :
- [ ] `create-order` en `intent: AUTHORIZE` (fonds bloqués, non prélevés)
- [ ] À l'**acceptation** DJ → **capture** (encaissement réel)
- [ ] Au **refus** DJ → **void** (annulation, **0 € de frais**, plus de remboursement)
- Évite de perdre la commission PayPal/Stripe sur chaque demande refusée.

### Note — Choix du prestataire
- **Stripe** : moins cher en Europe (~1,5 % + 0,25 € vs PayPal 2,9 % + 0,35 €), Apple/Google Pay natif.
- **Stripe Connect** : nécessaire pour le versement direct multi-DJ (TODO 1 option A).
- Le frais fixe (~0,25-0,35 €) pèse lourd sur les micro-pourboires → prévoir un **montant minimum**.
