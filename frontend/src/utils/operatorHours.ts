export interface OperatorHoursResult {
  hours: number;
  minutes: number;
  seconds: number;
}

export function calculateOperatorHours(
  dutyTimeSeconds: number,
  quantityProduced: number,
  tenHourTarget: number,
  twelveHourTarget: number,
  downtimeSeconds: number = 0,
): OperatorHoursResult {
  const targetHours = dutyTimeSeconds >= 43200 ? 12 : 10;
  const target = targetHours === 12 ? twelveHourTarget : tenHourTarget;

  if (target === 0) return { hours: 0, minutes: 0, seconds: 0 };

  const baseSeconds = Math.floor((quantityProduced * targetHours * 3600) / target);
  const totalSeconds = baseSeconds + downtimeSeconds;

  return {
    hours: Math.floor(totalSeconds / 3600),
    minutes: Math.floor((totalSeconds % 3600) / 60),
    seconds: totalSeconds % 60,
  };
}

export function calculateTenHourTarget(cycleTimeSeconds: number, loadingTime: number, unloadingTime: number): number {
  const productiveTime = 32490; // 9.5h * 0.95
  const totalCycle = cycleTimeSeconds + loadingTime + unloadingTime;
  if (totalCycle === 0) return 0;
  return Math.round(productiveTime / totalCycle);
}

export function calculateTwelveHourTarget(cycleTimeSeconds: number, loadingTime: number, unloadingTime: number): number {
  const productiveTime = 37620; // 11h * 0.95
  const totalCycle = cycleTimeSeconds + loadingTime + unloadingTime;
  if (totalCycle === 0) return 0;
  return Math.round(productiveTime / totalCycle);
}

export function calculateDutyTime(punchInMs: number, punchOutMs: number): number {
  if (punchOutMs <= punchInMs) return 0;
  const durationSeconds = Math.floor((punchOutMs - punchInMs) / 1000);
  const totalMinutes = Math.floor(durationSeconds / 60);
  if (durationSeconds >= 43200) return durationSeconds;
  if (totalMinutes >= 30) return durationSeconds - 1800;
  return durationSeconds;
}
