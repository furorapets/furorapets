/**
 * Computes human-readable age from a Date of Birth.
 * Output examples: "2 months", "1 year 3 months", "24 days", "8 months 12 days".
 */
export function calculateAge(dobInput: Date | string): {
  years: number;
  months: number;
  days: number;
  formatted: string;
} {
  const dob = typeof dobInput === 'string' ? new Date(dobInput) : dobInput;
  const now = new Date();

  let years = now.getFullYear() - dob.getFullYear();
  let months = now.getMonth() - dob.getMonth();
  let days = now.getDate() - dob.getDate();

  if (days < 0) {
    months -= 1;
    // Get days in previous month
    const prevMonthLastDay = new Date(now.getFullYear(), now.getMonth(), 0).getDate();
    days += prevMonthLastDay;
  }

  if (months < 0) {
    years -= 1;
    months += 12;
  }

  years = Math.max(0, years);
  months = Math.max(0, months);
  days = Math.max(0, days);

  const parts: string[] = [];
  if (years > 0) parts.push(`${years} ${years === 1 ? 'yr' : 'yrs'}`);
  if (months > 0) parts.push(`${months} ${months === 1 ? 'mo' : 'mos'}`);
  if (years === 0 && months === 0) {
    parts.push(`${days} ${days === 1 ? 'day' : 'days'}`);
  }

  return {
    years,
    months,
    days,
    formatted: parts.join(' ') || '0 days',
  };
}
