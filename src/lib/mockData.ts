import type { WorkspaceData } from "@/types";

export const mockData: Record<"pro" | "perso", WorkspaceData> = {
  pro: {
    tasks: [],
    agenda: [],
    horizons: [],
    coach: {
      matin: {
        titre: "Bonjour, prêt pour la journée ?",
        corps: "Consultez vos tâches Microsoft To Do et votre agenda pour planifier votre journée.\nVos objectifs sont à jour dans l'onglet Objectifs.",
        signe: "Aria · Coach",
        ton: "Direct",
      },
      midi: {
        titre: "Bonne progression",
        corps: "La matinée est passée — faites le point sur vos priorités de l'après-midi.\nConsultez vos mails pour les sollicitations en attente.",
        signe: "Aria · Coach",
        ton: "Direct",
      },
      soir: {
        titre: "Fin de journée",
        corps: "Prenez un moment pour noter ce que vous avez accompli aujourd'hui.\nPréparez vos priorités pour demain avant de fermer.",
        signe: "Aria · Coach",
        ton: "Direct",
      },
    },
    demain: [],
  },

  perso: {
    tasks: [],
    agenda: [],
    horizons: [],
    coach: {
      matin: {
        titre: "Bonne journée",
        corps: "Cet espace est dédié à votre vie personnelle.\nConfigurez vos objectifs et connectez un compte personnel pour accéder à vos données.",
        signe: "Aria · Coach",
        ton: "Chaleureux",
      },
      midi: {
        titre: "Comment se passe la journée ?",
        corps: "Prenez un moment pour vous.\nVos objectifs personnels sont dans l'onglet Objectifs.",
        signe: "Aria · Coach",
        ton: "Chaleureux",
      },
      soir: {
        titre: "Soirée",
        corps: "Bonne fin de journée.\nPensez à noter vos priorités pour demain.",
        signe: "Aria · Coach",
        ton: "Chaleureux",
      },
    },
    demain: [],
  },
};
