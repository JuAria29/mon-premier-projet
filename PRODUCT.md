# Aria — Base produit

## Vision

Un outil collaboratif de pilotage stratégique pour le groupe Aria Énergies.
**Pas un doublon d'Interfast.** Interfast gère l'opérationnel (devis, chantiers, planning).
Aria présente ce que les chiffres signifient : où en est-on par rapport aux objectifs, qui performe, quelle est la rentabilité réelle.

Du dirigeant à tous les collaborateurs — chacun voit son cap et sa contribution.

---

## Ce qui existe (à conserver ou refondre)

### Infrastructure — conserver tel quel
- Next.js 15 + Tailwind CSS
- Supabase (PostgreSQL + RLS + Auth)
- Microsoft OAuth (NextAuth.js)
- Déploiement Vercel
- Système de rôles et permissions (`v2/multi-users`)

### Modules actifs — décision en cours
| Module | Fichiers | Statut | Décision |
|---|---|---|---|
| **Finances** | `src/app/finances/` | Le plus complet | À refondre selon vision |
| **Chantiers Kanban** | `ChantierBoard.tsx` | Fonctionnel | Intégrer dans Finances |
| **Devis analytics** | `DevisTable.tsx` | Fonctionnel | Intégrer dans Finances |
| **Dashboard** | `src/app/page.tsx` | Données fictives | À connecter |
| **Rôles / Users** | `src/app/admin/` | Fonctionnel | Conserver |
| **Mails Outlook** | `src/app/mails/` | Fonctionnel | À décider |
| **Tâches To Do** | `src/app/taches/` | Fonctionnel | À décider |
| **Notes OneNote** | `src/app/notes/` | Fonctionnel | À décider |
| **Objectifs** | `src/app/objectifs/` | Squelette | À décider |
| **Coach IA** | `src/lib/claude.ts` | Partiel | À décider |

### Cache Supabase Interfast (données réelles)
- `interfast_devis_cache` : 100 devis synchro (1111 total disponibles)
- `interfast_chantiers_cache` : 77 chantiers synchro

---

## Architecture cible (à valider)

```
Aria
├── Tableau de bord stratégique        ← vue de pilotage, objectifs, KPIs clés
├── Commercial                          ← pipeline devis, taux signature, top clients
├── Chantiers                           ← avancement, retards, Kanban
├── Rentabilité                         ← marge réelle = CA - frais généraux, primes
├── Paramétrage                         ← coefficients FG, critères primes, rôles
└── (optionnel) Coach / Messagerie      ← à décider
```

---

## Modèle de rentabilité (à construire)

### Principe
```
Marge brute = Montant HT devis/chantier
Frais généraux = Marge brute × Coefficient FG  (défini dans Paramétrage)
Marge nette distribuable = Marge brute - Frais généraux
Prime collaborateur = Marge nette × Critères (% définis par le dirigeant)
```

### Questions ouvertes
- Le coefficient FG est-il unique (global société) ou par activité / collaborateur ?
- Les critères de prime : sur quoi portent-ils ? (CA signé, chantiers terminés, délai, etc.)
- L'assignation chantier/devis → collaborateur : est-elle dans Interfast ou à saisir dans Aria ?

---

## Rôles confirmés
| Rôle | Accès |
|---|---|
| Dirigeant | Tout + paramétrage + primes |
| Resp. Commercial | Pipeline équipe + objectifs commerciaux |
| Commercial | Son pipeline uniquement |
| Assistante Technique | Planning + chantiers |
| Technicien | Ses chantiers |
| Comptable | Finances lecture + export |

---

## Source de données
| Donnée | Source |
|---|---|
| Devis | Interfast MCP → cache Supabase |
| Chantiers | Interfast MCP → cache Supabase |
| Mails / Agenda | Microsoft Graph API |
| Comptabilité | Pennylane API |
| Objectifs / Coefficients | Saisie manuelle dans Aria (Supabase) |

---

## Ce qui reste à décider (questions ouvertes)
Voir conversation en cours.
