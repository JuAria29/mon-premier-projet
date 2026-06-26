import Anthropic from "@anthropic-ai/sdk";
import type { Mail, GraphTask } from "@/types";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const systemPrompts: Record<string, string> = {
  direct: `Tu es Aria, un coach stratégique personnel. Ton style est direct, concis et orienté action.
Tu vas droit au but, sans fioritures. Tes réponses sont courtes et actionnables.`,
  chaleureux: `Tu es Aria, un coach stratégique personnel. Ton style est chaleureux, empathique et bienveillant.
Tu encourages, tu soutiens, tu montres de la compréhension tout en guidant vers l'action.`,
  exigeant: `Tu es Aria, un coach stratégique personnel. Ton style est exigeant, ambitieux et orienté résultat.
Tu ne fais pas dans la complaisance. Tu pousses à donner le meilleur, tu identifies les vraies priorités.`,
};

export async function analyzeMail(
  mail: Mail,
  ton: string
): Promise<{ resume: string; action: string; brouillon: string }> {
  const systemPrompt = systemPrompts[ton] || systemPrompts.direct;

  const userPrompt = `Analyse ce mail et réponds en JSON avec exactement ces 3 champs :
- "resume" : résumé en 2 phrases max de ce que demande ce mail
- "action" : action concrète suggérée (1 phrase)
- "brouillon" : brouillon de réponse complet, prêt à envoyer, en français professionnel

Mail :
De : ${mail.from} <${mail.fromEmail}>
Objet : ${mail.subject}
Date : ${mail.date}

${mail.body.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim().slice(0, 3000)}

Réponds uniquement avec le JSON, sans markdown ni balises de code.`;

  const message = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 1024,
    system: systemPrompt,
    messages: [{ role: "user", content: userPrompt }],
  });

  const text = message.content[0].type === "text" ? message.content[0].text : "";

  try {
    const parsed = JSON.parse(text);
    return {
      resume: parsed.resume || "",
      action: parsed.action || "",
      brouillon: parsed.brouillon || "",
    };
  } catch {
    return {
      resume: "Analyse indisponible.",
      action: "Relire le mail et décider d'une action.",
      brouillon: text,
    };
  }
}

export async function analyzeTaskList(
  tasks: GraphTask[],
  ton: string
): Promise<{ vue: string; priorites: { title: string; raison: string }[]; conseil: string }> {
  const systemPrompt = systemPrompts[ton] || systemPrompts.direct;

  const taskLines = tasks
    .map((t) => `- [${t.importance === "high" ? "HAUTE" : t.importance === "normal" ? "normale" : "faible"}] ${t.title}${t.dueDateTime ? ` (échéance : ${new Date(t.dueDateTime).toLocaleDateString("fr-FR")})` : ""}${t.listName ? ` [${t.listName}]` : ""}`)
    .join("\n");

  const userPrompt = `Analyse cette liste de tâches et réponds en JSON avec exactement ces 3 champs :
- "vue" : synthèse en 2 phrases de l'état de la charge de travail
- "priorites" : tableau des 3 tâches les plus importantes aujourd'hui, chacune avec "title" (titre exact) et "raison" (1 phrase pourquoi)
- "conseil" : conseil stratégique en 1 phrase pour avancer efficacement

Tâches :
${taskLines}

Réponds uniquement avec le JSON, sans markdown ni balises de code.`;

  const message = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 800,
    system: systemPrompt,
    messages: [{ role: "user", content: userPrompt }],
  });

  const text = message.content[0].type === "text" ? message.content[0].text : "";

  try {
    const parsed = JSON.parse(text);
    return {
      vue: parsed.vue || "",
      priorites: Array.isArray(parsed.priorites) ? parsed.priorites.slice(0, 3) : [],
      conseil: parsed.conseil || "",
    };
  } catch {
    return { vue: "Analyse indisponible.", priorites: [], conseil: "" };
  }
}

export async function analyzeNote(
  title: string,
  content: string,
  ton: string
): Promise<{ resume: string; actions: string[]; conseil: string }> {
  const systemPrompt = systemPrompts[ton] || systemPrompts.direct;

  const userPrompt = `Analyse cette note OneNote et réponds en JSON avec exactement ces 3 champs :
- "resume" : résumé en 2 phrases de ce que contient cette note
- "actions" : tableau des actions concrètes identifiées (max 5, chacune en 1 phrase)
- "conseil" : conseil coach en 1 phrase sur quoi faire en priorité avec cette note

Note : "${title}"
Contenu :
${content.slice(0, 3000)}

Réponds uniquement avec le JSON, sans markdown ni balises de code.`;

  const message = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 600,
    system: systemPrompt,
    messages: [{ role: "user", content: userPrompt }],
  });

  const text = message.content[0].type === "text" ? message.content[0].text : "";

  try {
    const parsed = JSON.parse(text);
    return {
      resume: parsed.resume || "",
      actions: Array.isArray(parsed.actions) ? parsed.actions.slice(0, 5) : [],
      conseil: parsed.conseil || "",
    };
  } catch {
    return { resume: "Analyse indisponible.", actions: [], conseil: "" };
  }
}
