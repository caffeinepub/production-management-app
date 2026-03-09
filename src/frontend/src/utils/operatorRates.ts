const RATES_KEY = "prodmgr_operator_rates";

export function saveOperatorRate(
  operatorId: string,
  ratePerHour: number,
): void {
  try {
    const all = getAllOperatorRates();
    all[operatorId] = ratePerHour;
    localStorage.setItem(RATES_KEY, JSON.stringify(all));
  } catch {
    // silently fail
  }
}

export function getOperatorRate(operatorId: string): number {
  try {
    const all = getAllOperatorRates();
    return all[operatorId] ?? 0;
  } catch {
    return 0;
  }
}

export function getAllOperatorRates(): Record<string, number> {
  try {
    const raw = localStorage.getItem(RATES_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as Record<string, number>;
  } catch {
    return {};
  }
}
