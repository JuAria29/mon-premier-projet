import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createSupabaseServiceClient } from "@/lib/supabase";
import { getTasks, isMicrosoftConnected } from "@/lib/microsoft";
import type { ObjectiveLevel } from "@/types";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const LEVEL_LABELS: Record<ObjectiveLevel, string> = {
  jour: "Aujourd'hui",
  semaine: "Cette semaine",
  mois: "Ce mois",
  trimestre: "Ce trimestre",
  an: "Cette année",
  "5ans": "Dans 5 ans",
};

const tonDescriptions: Record<string, string> = {
  direct:
    "direct, concis et orienté action. Tu vas droit au but, sans fioritures. Tes réponses sont courtes et actionnables.",
  chaleureux:
    "chaleureux, empathique et bienveillant. Tu encourages, tu soutiens, tu montres de la compréhension tout en guidant vers l'action.",
  exigeant:
    "exigeant, ambitieux et orienté résultat. Tu ne fais pas dans la complaisance. Tu pousses à donner le meilleur, tu identifies les vraies priorités.",
};

const briefingTriggers: Record<string, string> = {
  matin:
    "Fais-moi un briefing de démarrage pour cette journée. Analyse mes objectifs et mes tâches, et propose-moi 3 priorités concrètes pour aujourd'hui. Sois précis et actionnable.",
  midi:
    "Fais un point de mi-journée. Sur la base de mes objectifs et de mes tâches en cours, qu'est-ce qui devrait être ma priorité pour cet après-midi ?",
  soir:
    "Aide-moi à faire le bilan de cette journée. Sur la base de mes objectifs, qu'est-ce que j'aurais dû accomplir aujourd'hui, et qu'est-ce que je prépare pour demain ?",
};

export async function POST(req: NextRequest) {
  try {
    const {
      messages,
      workspace = "pro",
      ton = "direct",
      session = "matin",
      trigger,
    } = await req.json();

    const USER_ID = `julien-${workspace}`;
    const today = new Date().toLocaleDateString("fr-FR", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    // Fetch objectives
    const supabase = createSupabaseServiceClient();
    const { data: objectives } = await supabase
      .from("objectives")
      .select("*")
      .eq("user_id", USER_ID);

    const objectivesContext =
      objectives && objectives.length > 0
        ? objectives
            .filter((o: { texte: string }) => o.texte)
            .map(
              (o: { level: ObjectiveLevel; texte: string; pct: number }) =>
                `- ${LEVEL_LABELS[o.level] ?? o.level} : ${o.texte} (${o.pct}% accompli)`
            )
            .join("\n")
        : "Aucun objectif défini pour l'instant.";

    // Fetch tasks from Microsoft if connected
    let tasksContext =
      "Tâches Microsoft To Do : non disponible (compte non connecté).";
    try {
      const connected = await isMicrosoftConnected(USER_ID);
      if (connected) {
        const tasks = await getTasks(USER_ID);
        const pending = tasks.filter((t) => t.status !== "completed").slice(0, 12);
        if (pending.length > 0) {
          tasksContext =
            `Tâches Microsoft To Do (${pending.length} en cours) :\n` +
            pending
              .map(
                (t) =>
                  `- [${t.importance === "high" ? "urgent" : t.importance ?? "normal"}] ${t.title}${
                    t.dueDateTime
                      ? ` — échéance : ${new Date(t.dueDateTime).toLocaleDateString("fr-FR")}`
                      : ""
                  }${t.listName ? ` (liste : ${t.listName})` : ""}`
              )
              .join("\n");
        } else {
          tasksContext = "Tâches Microsoft To Do : aucune tâche en cours.";
        }
      }
    } catch {
      // Microsoft not reachable — keep default message
    }

    const sessionNames: Record<string, string> = {
      matin: "matin (début de journée)",
      midi: "midi (mi-journée)",
      soir: "soir (fin de journée)",
    };

    const systemPrompt = `Tu es Aria, le coach stratégique personnel de Julien Pasini. Ton style est ${
      tonDescriptions[ton] ?? tonDescriptions.direct
    }

**Contexte en temps réel**
- Date : ${today}
- Moment de la journée : ${sessionNames[session] ?? session}
- Espace de travail : ${workspace === "pro" ? "Professionnel" : "Personnel"}

**Objectifs de Julien**
${objectivesContext}

**${tasksContext}**

Tu as accès à ces données en temps réel. Appuie-toi dessus pour contextualiser tes réponses.
Quand on te demande un briefing ou des suggestions, propose des actions concrètes liées aux objectifs et tâches réels.
Réponds toujours en français. Sois précis, actionnable et adapté au moment de la journée.
N'invente pas de données — si une information est absente, dis-le clairement.`;

    // Build messages for Claude
    let claudeMessages: { role: "user" | "assistant"; content: string }[] =
      messages ?? [];

    if (trigger === "briefing") {
      claudeMessages = [
        {
          role: "user",
          content: briefingTriggers[session] ?? briefingTriggers.matin,
        },
      ];
    }

    if (!claudeMessages || claudeMessages.length === 0) {
      return NextResponse.json({ error: "messages requis" }, { status: 400 });
    }

    const response = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1024,
      system: systemPrompt,
      messages: claudeMessages,
    });

    const text =
      response.content[0].type === "text" ? response.content[0].text : "";
    return NextResponse.json({ reply: text });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erreur inconnue";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
