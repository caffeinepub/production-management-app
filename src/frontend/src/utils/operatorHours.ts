/**
 * Utility for calculating Total Operator Hours based on duty time threshold.
 * 
 * Rules:
 * - If duty time < 12 hours: use cycle time for 10-hour target × quantity + downtime
 * - If duty time >= 12 hours: use cycle time for 12-hour target × quantity + downtime
 * - Always include downtime when present
 * - Safe fallback when duty time is unavailable
 * - Quantity defaults to 0 when blank/invalid (not 1)
 */

interface TimeInterval {
  hours: number;
  minutes: number;
  seconds: number;
}

interface OperatorHoursParams {
  dutyTimeInSeconds: number;
  cycleTimeForTenHourTarget: number; // in seconds (possibly fractional)
  cycleTimeForTwelveHourTarget: number; // in seconds (possibly fractional)
  quantityProduced: number; // Use 0 when blank/invalid, not 1
  downtimeInSeconds: number;
}

/**
 * Calculate Total Operator Hours using duty-time threshold rule.
 * 
 * @param params - Calculation parameters
 * @returns TimeInterval with hours, minutes, seconds
 */
export function calculateTotalOperatorHours(params: OperatorHoursParams): TimeInterval {
  const {
    dutyTimeInSeconds,
    cycleTimeForTenHourTarget,
    cycleTimeForTwelveHourTarget,
    quantityProduced,
    downtimeInSeconds,
  } = params;

  let totalOperatorSeconds: number;

  // Round cycle times to whole seconds before multiplying by quantity
  const roundedTenHourCycleTime = Math.round(cycleTimeForTenHourTarget);
  const roundedTwelveHourCycleTime = Math.round(cycleTimeForTwelveHourTarget);

  // Safe fallback: if duty time is not available or invalid, use 10h cycle time
  if (dutyTimeInSeconds <= 0) {
    totalOperatorSeconds = (roundedTenHourCycleTime * quantityProduced) + downtimeInSeconds;
  } else if (dutyTimeInSeconds < (12 * 3600)) {
    // Duty time < 12 hours: use cycle time for 10-hour target
    totalOperatorSeconds = (roundedTenHourCycleTime * quantityProduced) + downtimeInSeconds;
  } else {
    // Duty time >= 12 hours: use cycle time for 12-hour target
    totalOperatorSeconds = (roundedTwelveHourCycleTime * quantityProduced) + downtimeInSeconds;
  }

  const hours = Math.floor(totalOperatorSeconds / 3600);
  const minutes = Math.floor((totalOperatorSeconds % 3600) / 60);
  const seconds = Math.floor(totalOperatorSeconds % 60);

  return { hours, minutes, seconds };
}

/**
 * Format time interval to human-readable string.
 */
export function formatTimeInterval(time: TimeInterval): string {
  const parts: string[] = [];
  if (time.hours > 0) parts.push(`${time.hours}h`);
  if (time.minutes > 0) parts.push(`${time.minutes}m`);
  if (time.seconds > 0) parts.push(`${time.seconds}s`);
  return parts.length > 0 ? parts.join(' ') : '0s';
}
