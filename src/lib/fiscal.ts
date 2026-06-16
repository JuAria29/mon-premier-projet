export interface FiscalYear {
  start: string;     // "2025-10-01"
  end: string;       // "2026-09-30"
  label: string;     // "2025-2026"
  startYear: number; // 2025
  isCurrent: boolean;
}

export function makeFiscalYear(startYear: number): Omit<FiscalYear, "isCurrent"> {
  return {
    start: `${startYear}-10-01`,
    end: `${startYear + 1}-09-30`,
    label: `${startYear}-${startYear + 1}`,
    startYear,
  };
}

export function getCurrentFiscalYear(): FiscalYear {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1; // 1-12
  const startYear = month >= 10 ? year : year - 1;
  return { ...makeFiscalYear(startYear), isCurrent: true };
}

export function getAllFiscalYears(creationYear: number): FiscalYear[] {
  const current = getCurrentFiscalYear();
  const years: FiscalYear[] = [];
  for (let y = creationYear; y <= current.startYear; y++) {
    years.push({ ...makeFiscalYear(y), isCurrent: y === current.startYear });
  }
  return years;
}

export function getFiscalYearFromDate(date: Date): FiscalYear {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const startYear = month >= 10 ? year : year - 1;
  const current = getCurrentFiscalYear();
  return { ...makeFiscalYear(startYear), isCurrent: startYear === current.startYear };
}

// Returns months MM for the fiscal year (Oct→Sep)
export const FISCAL_MONTH_KEYS = (startYear: number) =>
  [10, 11, 12, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((m) => {
    const y = m >= 10 ? startYear : startYear + 1;
    return `${y}-${String(m).padStart(2, "0")}`;
  });

export const FISCAL_MONTH_LABELS = ["Oct", "Nov", "Déc", "Jan", "Fév", "Mar", "Avr", "Mai", "Jun", "Jul", "Aoû", "Sep"];
