import type { WorkspaceData } from "@/types";

export const mockData: Record<"pro" | "perso", WorkspaceData> = {
  pro: {
    tasks: [
      { id: "p1", titre: "Analyser les retours clients sur le devis Ariston", contexte: "Outlook", statut: "sollicitation", min: 20, priorite: "urgent" },
      { id: "p2", titre: "Préparer la réunion technique avec l'équipe terrain", contexte: "Agenda", statut: "a_faire", min: 45, priorite: "important" },
      { id: "p3", titre: "Lire les nouvelles normes RT2020 applicables en juillet", contexte: "OneNote", statut: "a_faire", min: 30, priorite: "strategique" },
      { id: "p4", titre: "Classer les factures en attente de validation", contexte: "Interfast", statut: "a_faire", min: 15, priorite: "courant" },
      { id: "p5", titre: "Envoyer le rapport mensuel à la direction", contexte: "Outlook", statut: "accompli", min: 25, priorite: "important" },
      { id: "p6", titre: "Déléguer le suivi chantier Dupont à Marc", contexte: "To Do", statut: "detache", min: 0, priorite: "courant" },
      { id: "p7", titre: "Mettre à jour le planning des interventions Q3", contexte: "Calendrier", statut: "a_faire", min: 35, priorite: "strategique" },
    ],
    agenda: [
      { id: "a1", h: "08:30", dur: 60, titre: "Intervention maintenance PAC — Dupont", lieu: "12 rue de la Paix, Lyon", type: "intervention" },
      { id: "a2", h: "11:00", dur: 45, titre: "Réunion technique équipe terrain", lieu: "Bureau Aria Énergies", type: "technique" },
      { id: "a3", h: "14:30", dur: 90, titre: "Rendez-vous commercial — client Bernardo", lieu: "Siège client, Villeurbanne", type: "commercial" },
      { id: "a4", h: "17:00", dur: 30, titre: "Point RH — contrat apprenti", lieu: "Visio", type: "rh" },
    ],
    horizons: [
      { id: "h1", label: "Aujourd'hui", objectif: "Traiter les sollicitations et préparer la réunion terrain", pct: 35 },
      { id: "h2", label: "Semaine", objectif: "Finaliser les devis en attente et valider les factures Q2", pct: 55 },
      { id: "h3", label: "Mois", objectif: "Lancer la démarche certification RGE renouvelée", pct: 40 },
      { id: "h4", label: "Trimestre", objectif: "Augmenter le CA de 15 % sur les pompes à chaleur", pct: 62 },
      { id: "h5", label: "5 ans", objectif: "Devenir référence régionale sur la rénovation énergétique", pct: 28 },
    ],
    coach: {
      matin: {
        titre: "Journée chargée — restez focalisé",
        corps: "Vous avez 3 tâches prioritaires et 4 rendez-vous aujourd'hui.\nCommencez par la sollicitation Ariston avant 10h.\nLa réunion terrain de 11h sera déterminante pour le planning Q3.",
        signe: "Aria · Coach",
        ton: "Direct",
      },
      midi: {
        titre: "Bonne progression ce matin",
        corps: "Le rapport mensuel est envoyé — bien joué.\nIl reste 2 tâches importantes pour l'après-midi.\nLe rendez-vous commercial à 14h30 mérite une préparation de 10 minutes.",
        signe: "Aria · Coach",
        ton: "Exigeant",
      },
      soir: {
        titre: "Bilan de la journée",
        corps: "Journée productive malgré la densité.\nLa délégation du suivi Dupont à Marc était le bon choix.\nDemain, concentrez-vous sur les normes RT2020 — c'est stratégique.",
        signe: "Aria · Coach",
        ton: "Bienveillant",
      },
    },
    demain: [
      { h: "08:00", t: "Lecture normes RT2020 (30 min)" },
      { h: "09:30", t: "Intervention Lefevre — Grenoble" },
      { h: "14:00", t: "Mise à jour planning Q3" },
      { h: "16:30", t: "Relance devis Martineau" },
    ],
  },

  perso: {
    tasks: [
      { id: "pp1", titre: "Réserver les billets de train pour les vacances août", contexte: "Personnel", statut: "sollicitation", min: 15, priorite: "urgent" },
      { id: "pp2", titre: "Rappeler le médecin pour le bilan annuel", contexte: "Santé", statut: "a_faire", min: 10, priorite: "important" },
      { id: "pp3", titre: "Finir le livre sur la gestion du temps", contexte: "Lecture", statut: "a_faire", min: 60, priorite: "strategique" },
      { id: "pp4", titre: "Courses bio au marché du samedi", contexte: "Maison", statut: "accompli", min: 45, priorite: "courant" },
      { id: "pp5", titre: "Préparer la sortie vélo du week-end", contexte: "Sport", statut: "a_faire", min: 20, priorite: "courant" },
    ],
    agenda: [
      { id: "pa1", h: "09:00", dur: 90, titre: "Sport — vélo route col de la Croix", lieu: "Départ domicile", type: "intervention" },
      { id: "pa2", h: "17:00", dur: 120, titre: "Dîner en famille chez les parents", lieu: "Saint-Priest", type: "rh" },
    ],
    horizons: [
      { id: "ph1", label: "Aujourd'hui", objectif: "Recharger les batteries et passer du temps en famille", pct: 50 },
      { id: "ph2", label: "Semaine", objectif: "Maintenir 3 séances de sport et avancer sur la lecture", pct: 45 },
      { id: "ph3", label: "Mois", objectif: "Préparer et organiser les vacances d'été", pct: 30 },
      { id: "ph4", label: "Trimestre", objectif: "Terminer la formation en ligne sur la prise de parole", pct: 60 },
      { id: "ph5", label: "5 ans", objectif: "Atteindre un équilibre vie pro / vie perso durable", pct: 42 },
    ],
    coach: {
      matin: {
        titre: "Journée pour vous",
        corps: "Profitez de cette journée hors cadre professionnel.\nLa sortie vélo ce matin est un excellent choix pour décompresser.\nPensez à réserver les billets de train — c'est urgent.",
        signe: "Aria · Coach",
        ton: "Chaleureux",
      },
      midi: {
        titre: "Belle matinée sportive",
        corps: "La balade vélo est dans les boîtes — bravo pour la régularité.\nL'après-midi, un moment en famille vous rechargera durablement.\nLa lecture de ce soir peut attendre si vous êtes fatigué.",
        signe: "Aria · Coach",
        ton: "Chaleureux",
      },
      soir: {
        titre: "Une journée bien équilibrée",
        corps: "Sport le matin, famille l'après-midi — c'est exactement ça, l'équilibre.\nPensez à noter 3 choses positives avant de dormir.\nDemain, bloquez 30 minutes pour les billets de train.",
        signe: "Aria · Coach",
        ton: "Bienveillant",
      },
    },
    demain: [
      { h: "09:00", t: "Réserver billets de train (15 min)" },
      { h: "10:30", t: "Appel médecin pour bilan annuel" },
      { h: "14:00", t: "Lecture — chapitre 6" },
    ],
  },
};
