import Anthropic from "@anthropic-ai/sdk";
import type { Mail } from "@/types";

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
