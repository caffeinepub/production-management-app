/**
 * Utility for calculating Total Operator Hours using the new formula based on adjusted Duty Time.
 * 
 * Rules:
 * - If adjusted Duty Time ≤ 10 hours: Total Operator Hours = (quantityProduced / tenHourTarget) × 10
 * - If adjusted Duty Time > 10 hours: Total Operator Hours = (quantityProduced / twelveHourTarget) × 12
 * - Safe fallback to 0 when targets are invalid (0 or undefined)
 * - No target-achieved capping behavior
 */

interface TimeInterval {
  hours: number;
  minutes: number;
  seconds: number;
}

interface OperatorHoursParams {
  dutyTimeInSeconds: number;
  quantityProduced: number;
  tenHourTarget: number;
  twelveHourTarget: number;
}

/**
 * Calculate adjusted Duty Time by deducting 30 minutes when raw punch-in to punch-out duration is < 12 hours.
 * Never returns negative values.
 * Returns 0 for invalid time ranges (punch out <= punch in).
 * 
 * @param punchInTime - Punch in time string (HH:mm format)
 * @param punchOutTime - Punch out time string (HH:mm format)
 * @returns Adjusted duty time in seconds
 */
export function calculateAdjustedDutyTimeSeconds(punchInTime: string, punchOutTime: string): number {
  if (!punchInTime || !punchOutTime) return 0;
  
  const punchIn = new Date(`1970-01-01T${punchInTime}`);
  const punchOut = new Date(`1970-01-01T${punchOutTime}`);
  
  // Return 0 for invalid ranges (punch out <= punch in)
  if (punchOut <= punchIn) return 0;
  
  const diffMs = punchOut.getTime() - punchIn.getTime();
  const rawDurationSeconds = Math.floor(diffMs / 1000);
  
  // If raw duration is less than 12 hours (43200 seconds), deduct 30 minutes (1800 seconds)
  if (rawDurationSeconds < 43200) {
    const adjustedSeconds = rawDurationSeconds - 1800; // 30 minutes = 1800 seconds
    return Math.max(0, adjustedSeconds); // Never negative
  }
  
  return rawDurationSeconds;
}

/**
 * Convert seconds to TimeInterval object.
 */
export function convertSecondsToTimeInterval(totalSeconds: number): TimeInterval {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = Math.floor(totalSeconds % 60);
  
  return { hours, minutes, seconds };
}

/**
 * Calculate Total Operator Hours using the new formula based on adjusted Duty Time threshold.
 * 
 * @param params - Calculation parameters
 * @returns TimeInterval with hours, minutes, seconds
 */
export function calculateTotalOperatorHours(params: OperatorHoursParams): TimeInterval {
  const {
    dutyTimeInSeconds,
    quantityProduced,
    tenHourTarget,
    twelveHourTarget,
  } = params;

  // Determine which target to use based on adjusted duty time threshold
  const useTenHourFormula = dutyTimeInSeconds <= (10 * 3600); // 10 hours = 36000 seconds
  
  let totalOperatorHoursFloat: number;
  
  if (useTenHourFormula) {
    // Use 10-hour formula: (quantityProduced / tenHourTarget) × 10
    if (tenHourTarget === 0) {
      totalOperatorHoursFloat = 0; // Safe fallback
    } else {
      totalOperatorHoursFloat = (quantityProduced / tenHourTarget) * 10;
    }
  } else {
    // Use 12-hour formula: (quantityProduced / twelveHourTarget) × 12
    if (twelveHourTarget === 0) {
      totalOperatorHoursFloat = 0; // Safe fallback
    } else {
      totalOperatorHoursFloat = (quantityProduced / twelveHourTarget) * 12;
    }
  }
  
  // Convert fractional hours to seconds, then to TimeInterval
  const totalOperatorSeconds = Math.floor(totalOperatorHoursFloat * 3600);
  
  return convertSecondsToTimeInterval(totalOperatorSeconds);
}

/**
 * Format time interval to human-readable string.
 * This is the canonical formatter used across Data Entry and Reports for consistency.
 */
export function formatTimeInterval(time: TimeInterval): string {
  const parts: string[] = [];
  if (time.hours > 0) parts.push(`${time.hours}h`);
  if (time.minutes > 0) parts.push(`${time.minutes}m`);
  if (time.seconds > 0) parts.push(`${time.seconds}s`);
  return parts.length > 0 ? parts.join(' ') : '0s';
}

/**
 * Format time interval from bigint values (for backend data).
 * Converts bigint to number and uses the canonical formatter.
 */
export function formatTimeIntervalFromBigInt(hours: bigint, minutes: bigint, seconds: bigint): string {
  return formatTimeInterval({
    hours: Number(hours),
    minutes: Number(minutes),
    seconds: Number(seconds),
  });
}

/**
 * Convert time interval to total seconds.
 * Supports both number and bigint inputs for flexibility.
 */
export function convertTimeIntervalToSeconds(
  time: { hours: number | bigint; minutes: number | bigint; seconds: number | bigint }
): number {
  return Number(time.hours) * 3600 + Number(time.minutes) * 60 + Number(time.seconds);
}
