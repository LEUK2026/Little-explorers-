export function attendanceMinutes(start: string, end: string): number {
  const parse = (value: string) => {
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(value)) throw new Error("Invalid attendance time.");
    const [hours, minutes] = value.split(":").map(Number);
    return hours * 60 + minutes;
  };
  const duration = parse(end) - parse(start);
  if (duration <= 0 || duration > 16 * 60) throw new Error("Attendance must be within one day and at most 16 hours.");
  return duration;
}

export function costPence(minutes: number, ratePence: number): number {
  if (!Number.isSafeInteger(minutes) || minutes < 0 || !Number.isSafeInteger(ratePence) || ratePence < 0) {
    throw new Error("Invalid billing amount.");
  }
  return Math.round((minutes * ratePence) / 60);
}

export function addCalendarMonths(dateString: string, months: number): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateString)) throw new Error("Invalid date.");
  const [year, month, day] = dateString.split("-").map(Number);
  const original = new Date(Date.UTC(year, month - 1, day));
  if (original.toISOString().slice(0, 10) !== dateString) throw new Error("Invalid calendar date.");
  const target = new Date(Date.UTC(year, month - 1 + months, 1));
  const last = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate();
  target.setUTCDate(Math.min(day, last));
  return target.toISOString().slice(0, 10);
}

export function previousMonth(today: Date): { start: string; end: string } {
  const year = today.getUTCFullYear();
  const month = today.getUTCMonth();
  const start = new Date(Date.UTC(year, month - 1, 1)).toISOString().slice(0, 10);
  const end = new Date(Date.UTC(year, month, 0)).toISOString().slice(0, 10);
  return { start, end };
}
