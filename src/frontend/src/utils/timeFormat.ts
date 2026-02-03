/**
 * Shared time formatting utility for consistent minutes+seconds display.
 * Handles rounding and carry (e.g., 59.6s -> "1m 00s").
 */

/**
 * Format seconds (possibly fractional) as "Xm Ys" with proper rounding and carry.
 * Always shows minutes (even if 0) and zero-pads seconds.
 * 
 * @param totalSeconds - Time in seconds (can be fractional)
 * @returns Formatted string like "1m 05s" or "0m 30s"
 */
export function formatSecondsAsMinutesSeconds(totalSeconds: number): string {
  // Round to nearest whole second
  const roundedSeconds = Math.round(totalSeconds);
  
  // Calculate minutes and seconds with carry
  const minutes = Math.floor(roundedSeconds / 60);
  const seconds = roundedSeconds % 60;
  
  // Zero-pad seconds to 2 digits
  const paddedSeconds = seconds.toString().padStart(2, '0');
  
  return `${minutes}m ${paddedSeconds}s`;
}
