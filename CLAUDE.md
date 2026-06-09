# Aria Coach — CLAUDE.md

## Vision
Assistant coach stratégique personnel connecté à Microsoft 365.
Il analyse mails, notes et tâches, prépare les réponses, suggère les priorités
et accompagne Julien dans ses objectifs quotidiens et à long terme — pour passer de réactif à proactif.

---

## Charte graphique
@./assets/charte.md

---

## Stack technique
- Frontend : Next.js + Tailwind CSS
- BDD : Supabase (PostgreSQL + Auth)
- Auth : Microsoft OAuth via NextAuth.js
- Intégrations : Microsoft Graph API (Outlook, OneNote, To Do, Calendar)
- IA : Claude API (Anthropic — claude-sonnet-4-6)
- Hébergement : Vercel

---

## Commandes courantes
- Lancer en dev : `npm run dev`
- Builder : `npm run build`
- Générer les types Supabase : `npx supabase gen types typescript`

---

## Fonctionnalités V1

**Dashboard central** — L'utilisateur ouvre l'app → voit ses tâches du jour avec timing estimé, ses RDV, le statut de chaque item (accompli / détaché / sollicitation) et une trame de ses objectifs moyen/long terme. 3 sessions : matin / midi / soir.

**Lecteur Outlook** — L'utilisateur sélectionne un mail → le coach analyse et propose un brouillon de réponse ou une action à planifier.

**Lecteur OneNote + To Do** — Le coach lit les notes et tâches → extrait et classe les actions prioritaires dans le dashboard.

**Personnalisation du coach** — L'utilisateur configure le ton et le style d'échange (formel / direct / bienveillant exigeant). Appliqué à toutes les réponses IA.

## Fonctionnalités V2 (ne pas construire maintenant)
- Outlook Calendar — suggestions d'interventions / RDV
- Revue quotidienne & hebdomadaire automatique
- Système de priorités avancé (urgent / important / stratégique)
- Notifications proactives si action non faite
- Suivi d'habitudes
- Capture rapide d'idées
- Journal de bord
- Rapport hebdomadaire automatique
- Intégration Interfast (devis, interventions, planning)
- Coach vocal

---

## Profils et droits
| Profil | Droits |
|---|---|
| Julien (admin) | Accès total |
| V future — Collaborateur | Vue limitée à son périmètre |
| V future — Dirigeant tiers | Dashboard personnalisé |

---

## Phases de développement
> Une phase à la fois. Valider avant de passer à la suivante.
> En fin de phase longue : taper `/compact` avant de démarrer la suivante.

### Phase 1 — Fondations
**Objectif :** Projet déployé, accessible, identité visuelle en place.
- [ ] Initialiser Next.js + Tailwind, intégrer la charte (assets/charte.md)
- [ ] Connecter Supabase (auth + BDD)
- [ ] Configurer Microsoft OAuth (NextAuth.js + Azure App Registration)
- [ ] Déployer sur Vercel
**Validé quand :** l'app s'ouvre en ligne, connexion avec compte Microsoft fonctionnelle.

### Phase 2 — Interface principale
**Objectif :** Le dashboard est visible et navigable dans les 3 sessions.
- [ ] Layout sidebar + topbar avec bascule matin / midi / soir
- [ ] Dashboard matin : tâches du jour + timing estimé, RDV, statuts, objectifs long terme
- [ ] Dashboard midi : même vue + barre de progression journalière
- [ ] Dashboard soir : débrief + anticipation du lendemain
- [ ] Écran de personnalisation du coach (ton, style)
**Validé quand :** les 3 sessions s'affichent avec des données fictives, navigation fluide.

### Phase 3 — Fonctionnalités core
**Objectif :** Le coach lit les données réelles et génère des réponses.

**Objectifs multi-niveaux**
- [ ] Interface de saisie : jour / semaine / mois / semestre / an / 5 ans
- [ ] Persistance Supabase
- [ ] Affichage dans le dashboard avec trame de progression
**Validé quand :** Julien peut saisir ses objectifs et les voir dans le dashboard.

**Lecteur Outlook**
- [ ] Connexion Microsoft Graph API — lecture des mails entrants
- [ ] Analyse par Claude API + génération de brouillon de réponse
- [ ] Interface de validation du brouillon avant envoi
**Validé quand :** un mail entrant est analysé et un brouillon est proposé en 1 clic.

**Lecteur OneNote + To Do**
- [ ] Lecture des notes OneNote via Graph API
- [ ] Lecture des tâches To Do via Graph API
- [ ] Extraction et classement des actions prioritaires dans le dashboard
**Validé quand :** les tâches et notes apparaissent dans le dashboard avec un classement.

### Phase 4 — Intégrations IA
**Objectif :** Le coaching est fluide, personnalisé et cohérent.
- [ ] Intégration Claude API — prompts système selon profil coach configuré
- [ ] Personnalisation du ton appliquée à toutes les réponses
- [ ] Gestion des erreurs API (quota, token expiration M365)
**Validé quand :** le coach répond dans le bon ton sur toutes les fonctionnalités.

### Phase 5 — Finitions et lancement
**Objectif :** Prêt pour un usage quotidien réel sans friction.
- [ ] Tests desktop (Chrome, Safari)
- [ ] Tests mobile responsive
- [ ] Performance — chargement < 2s
- [ ] Sécurité : toutes les clés API en variables d'environnement
**Validé quand :** Julien utilise l'app chaque matin sans accroc pendant 5 jours.

---

## Règles pour Claude Code
- **Plan mode d'abord** : avant chaque phase, dire "fais un plan". Ne pas coder sans plan validé.
- **Une phase à la fois** : ne pas anticiper la phase suivante avant validation.
- **Git après chaque tâche validée** : dire "commit push".
- **Charte graphique** : respecter assets/charte.md à chaque composant créé.
- **Jamais de clé API dans le code client** : toujours via .env.local.
- **Confirmation obligatoire** avant toute suppression de données ou migration de schéma.
- **Microsoft Graph API** : utiliser les scopes minimaux nécessaires, ne jamais stocker les tokens M365 en clair.
