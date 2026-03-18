import { TimeEntry } from '../models/domain.models';

export function computeDurationMinutes(startedAt: string, endedAt: string | null): number | null {
  if (!endedAt) {
    return null;
  }

  const diff = new Date(endedAt).getTime() - new Date(startedAt).getTime();
  return Math.max(Math.round(diff / 60000), 0);
}

export function normalizeTimeEntryDuration(entry: TimeEntry): TimeEntry {
  return {
    ...entry,
    duration_minutes: computeDurationMinutes(entry.started_at, entry.ended_at),
  };
}
