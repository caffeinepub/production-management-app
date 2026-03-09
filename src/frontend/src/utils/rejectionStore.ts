const REJECTION_KEY = "prodmgr_rejections";

export function saveRejection(timestampNs: string, count: number): void {
  try {
    const all = getAllRejections();
    all[timestampNs] = count;
    localStorage.setItem(REJECTION_KEY, JSON.stringify(all));
  } catch {
    // silently fail
  }
}

export function getRejection(timestampNs: string): number {
  try {
    const all = getAllRejections();
    return all[timestampNs] ?? 0;
  } catch {
    return 0;
  }
}

export function getAllRejections(): Record<string, number> {
  try {
    const raw = localStorage.getItem(REJECTION_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as Record<string, number>;
  } catch {
    return {};
  }
}
