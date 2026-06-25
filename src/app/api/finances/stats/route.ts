import { NextResponse } from "next/server";
import { createSupabaseServiceClient } from "@/lib/supabase";

function parseNum(v: unknown) { return Number(v) || 0; }

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const debutOverride = searchParams.get("debut") ?? "";
  const finOverride = searchParams.get("fin") ?? "";

  const supabase = createSupabaseServiceClient();

  // Charger paramètres
  const { data: settingsRows } = await supabase.from("aria_settings").select("key, value");
  const settings: Record<string, unknown> = {};
  for (const r of settingsRows ?? []) settings[r.key] = r.value;

  const caObjectif = parseNum(settings.ca_objectif) || 600000;
  const fgCoefficient = parseNum(settings.fg_coefficient) || 35;
  const exerciceDebut = (settings.exercice_debut as string) || "10-01";
  const exerciceFin = (settings.exercice_fin as string) || "09-30";

  // Supporte les deux formats : "MM-DD" (legacy) et "YYYY-MM-DD" (nouveau)
  function parseExerciceDate(s: string, isFin: boolean): Date {
    const isFullDate = /^\d{4}-\d{2}-\d{2}$/.test(s);
    if (isFullDate) return new Date(s + "T00:00:00");
    // Legacy MM-DD : calcul auto de l'année
    const [mois, jour] = s.split("-").map(Number);
    const now = new Date();
    const y = now.getFullYear();
    const candidate = new Date(y, mois - 1, jour);
    if (isFin) {
      return candidate < now ? candidate : new Date(y - 1, mois - 1, jour);
    }
    return candidate > now ? new Date(y - 1, mois - 1, jour) : candidate;
  }

  const exerciceStart = parseExerciceDate(exerciceDebut, false);
  const exerciceEnd = parseExerciceDate(exerciceFin, true);
  // Si fin < début (exercice sur 2 années civiles), ajouter 1 an à la fin
  if (exerciceEnd <= exerciceStart) {
    exerciceEnd.setFullYear(exerciceEnd.getFullYear() + 1);
  }

  const fmt = (d: Date) => d.toISOString().slice(0, 10);

  // Utiliser les dates passées en param si présentes (sinon calcul depuis settings)
  const rangeDebut = debutOverride || fmt(exerciceStart);
  const rangeFin = finOverride || fmt(exerciceEnd);

  // Charger les mois de l'exercice
  const { data: rows } = await supabase
    .from("interfast_stats_cache")
    .select("*")
    .gte("debut", rangeDebut)
    .lte("fin", rangeFin)
    .order("debut");

  const months = rows ?? [];

  // Agréger en annuel
  const annual = months.reduce((acc, m) => ({
    devis_signes_ht:       acc.devis_signes_ht       + parseNum(m.devis_signes_ht),
    devis_reel_ht:         acc.devis_reel_ht         + parseNum(m.devis_reel_ht),
    devis_previsionnel_ht: acc.devis_previsionnel_ht + parseNum(m.devis_previsionnel_ht),
    devis_achats:          acc.devis_achats          + parseNum(m.devis_achats),
    ca_reel_ht:            acc.ca_reel_ht            + parseNum(m.ca_reel_ht),
    ca_previsionnel_ht:    acc.ca_previsionnel_ht    + parseNum(m.ca_previsionnel_ht),
    ca_main_oeuvre:        acc.ca_main_oeuvre        + parseNum(m.ca_main_oeuvre),
    ca_fournitures:        acc.ca_fournitures        + parseNum(m.ca_fournitures),
    ca_en_retard_ht:       acc.ca_en_retard_ht       + parseNum(m.ca_en_retard_ht),
    marge_reelle:          acc.marge_reelle          + parseNum(m.marge_reelle),
    marge_previsionnelle:  acc.marge_previsionnelle  + parseNum(m.marge_previsionnelle),
  }), {
    devis_signes_ht: 0, devis_reel_ht: 0, devis_previsionnel_ht: 0, devis_achats: 0,
    ca_reel_ht: 0, ca_previsionnel_ht: 0, ca_main_oeuvre: 0, ca_fournitures: 0,
    ca_en_retard_ht: 0, marge_reelle: 0, marge_previsionnelle: 0,
  });

  // Agréger en trimestriel
  const quarters: typeof months[] = [[], [], [], []];
  for (const m of months) {
    const d = new Date(m.debut);
    const monthsSinceStart = (d.getFullYear() - exerciceStart.getFullYear()) * 12
      + d.getMonth() - exerciceStart.getMonth();
    const q = Math.min(Math.floor(monthsSinceStart / 3), 3);
    quarters[q].push(m);
  }
  const quarterly = quarters.map((qMonths, i) => {
    const agg = qMonths.reduce((acc, m) => ({
      ca_reel_ht:         acc.ca_reel_ht         + parseNum(m.ca_reel_ht),
      ca_previsionnel_ht: acc.ca_previsionnel_ht + parseNum(m.ca_previsionnel_ht),
      devis_signes_ht:    acc.devis_signes_ht    + parseNum(m.devis_signes_ht),
      marge_reelle:       acc.marge_reelle       + parseNum(m.marge_reelle),
    }), { ca_reel_ht: 0, ca_previsionnel_ht: 0, devis_signes_ht: 0, marge_reelle: 0 });
    return { label: `T${i + 1}`, ...agg };
  });

  // Marge nette après FG
  const margeNette = annual.ca_reel_ht * (1 - fgCoefficient / 100);
  const avancementPct = caObjectif > 0 ? (annual.ca_reel_ht / caObjectif) * 100 : 0;

  return NextResponse.json({
    settings: { caObjectif, fgCoefficient, exerciceDebut, exerciceFin },
    exercice: { debut: fmt(exerciceStart), fin: fmt(exerciceEnd) },
    annual,
    quarterly,
    monthly: months,
    kpis: {
      avancementPct: Math.round(avancementPct * 10) / 10,
      margeNette: Math.round(margeNette),
      margeNettePct: fgCoefficient,
    },
  });
}
