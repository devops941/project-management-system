// Date helpers shared by deadline tracking and reporting.

export function startOfDay(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function endOfDay(date) {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

export function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

export function daysBetween(from, to) {
  const MS_PER_DAY = 24 * 60 * 60 * 1000;
  return Math.round((startOfDay(to) - startOfDay(from)) / MS_PER_DAY);
}

export function isOverdue(dueDate, status) {
  if (!dueDate) return false;
  if (status === 'DONE') return false;
  return new Date(dueDate).getTime() < startOfDay(new Date()).getTime();
}

export function isDueSoon(dueDate, status, withinDays) {
  if (!dueDate) return false;
  if (status === 'DONE') return false;
  const diff = daysBetween(new Date(), dueDate);
  return diff >= 0 && diff <= withinDays;
}

export function toDateOrNull(value) {
  if (value === undefined || value === null || value === '') return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}
