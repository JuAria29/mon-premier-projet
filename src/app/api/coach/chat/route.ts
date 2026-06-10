import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createSupabaseServiceClient } from "@/lib/supabase";
import { getTasks, getEmails, isMicrosoftConnected } from "@/lib/microsoft";
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
    "Donne-moi mon briefing du matin. Analyse mes mails récents, mes tâches et mes objectifs. Propose-moi 3 priorités concrètes pour aujourd'hui, en prenant en compte ce qui est urgent dans mes mails.",
  midi:
    "Point de mi-journée. Sur la base de mes mails, tâches et objectifs, qu'est-ce qui doit être ma priorité pour cet après-midi ? Y a-t-il des mails urgents qui nécessitent une réponse aujourd'hui ?",
  soir:
    "Bilan de fin de journée. Analyse mes mails non traités et mes tâches en suspens. Qu'est-ce que je dois préparer pour demain et y a-t-il des points urgents à ne pas oublier ?",
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

    // Fetch Microsoft data if connected
    let tasksContext = "Tâches Microsoft To Do : compte non connecté.";
    let mailsContext = "Mails récents : compte non connecté.";

    try {
      const connected = await isMicrosoftConnected(USER_ID);
      if (connected) {
        // Tasks
        const tasks = await getTasks(USER_ID);
        const pending = tasks.filter((t) => t.status !== "completed").slice(0, 12);
        tasksContext =
          pending.length > 0
            ? `Tâches Microsoft To Do (${pending.length} en cours) :\n` +
              pending
                .map(
                  (t) =>
                    `- [${t.importance === "high" ? "URGENT" : t.importance ?? "normal"}] ${t.title}${
                      t.dueDateTime
                        ? ` — échéance : ${new Date(t.dueDateTime).toLocaleDateString("fr-FR")}`
                        : ""
                    }${t.listName ? ` (${t.listName})` : ""}`
                )
                .join("\n")
            : "Tâches Microsoft To Do : aucune tâche en cours.";

        // Recent mails (preview only, no full body)
        const mails = await getEmails(USER_ID, 8);
        if (mails.length > 0) {
          mailsContext =
            `${mails.length} mails récents :\n` +
            mails
              .map((m) => {
                const date = new Date(m.date).toLocaleDateString("fr-FR", {
                  day: "numeric",
                  month: "short",
                  hour: "2-digit",
                  minute: "2-digit",
                });
                const preview = m.preview?.slice(0, 120).trim() || "(pas d'aperçu)";
                return `- [${date}] De : ${m.from} — Objet : ${m.subject}\n  Aperçu : ${preview}`;
              })
              .join("\n");
        } else {
          mailsContext = "Mails récents : boîte de réception vide.";
        }
      }
    } catch {
      // Microsoft not reachable — keep default messages
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
- Moment : ${sessionNames[session] ?? session}
- Espace : ${workspace === "pro" ? "Professionnel" : "Personnel"}

**Objectifs de Julien**
${objectivesContext}

**${tasksContext}**

**${mailsContext}**

Tu as accès à ces données en temps réel. Appuie-toi dessus pour contextualiser tes réponses.
Pour les briefings, analyse les mails urgents, les tâches en retard et les objectifs, et propose un plan d'action concret.
Réponds toujours en français. Sois précis et actionnable.
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
      max_tokens: 1200,
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
