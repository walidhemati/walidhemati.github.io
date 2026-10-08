/**
 * Work-collection helpers. ALL rendering of years, metrics and statuses goes
 * through here so the honesty rules (plan 6.1) live in one place.
 */
import { getCollection, type CollectionEntry } from 'astro:content';

export type Work = CollectionEntry<'work'>;
export type WorkData = Work['data'];

export const STATUS_LABEL: Record<WorkData['status'], { mark: '●' | '◐' | '○'; text: string }> = {
  current: { mark: '●', text: 'Current role' },
  'live-play': { mark: '●', text: 'Live on Google Play' },
  android: { mark: '●', text: 'Android' },
  'in-development': { mark: '◐', text: 'In development' },
  research: { mark: '◐', text: 'Research' },
  'open-source': { mark: '●', text: 'Open source' },
  coursework: { mark: '○', text: 'Coursework' },
  archived: { mark: '○', text: 'Archived' },
};

/** Status line, or null when it only repeats the discipline (Flatsnap: "Android"). */
export function visibleStatus(d: WorkData) {
  const s = STATUS_LABEL[d.status];
  const parts = d.discipline.split('·').map((p) => p.trim().toLowerCase());
  return parts.includes(s.text.toLowerCase()) ? null : s;
}

/** Filter chips on /work/ (plan 5.2): All · ML/CV · Android · Scientific · Research · Archive */
export const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'ml-cv', label: 'ML/CV' },
  { key: 'android', label: 'Android' },
  { key: 'scientific', label: 'Scientific' },
  { key: 'research', label: 'Research' },
  { key: 'archive', label: 'Archive' },
] as const;

/** Year string, or null when unconfirmed. Never guesses. */
export function visibleYear(d: WorkData): string | null {
  if (!d.yearConfirmed || !d.year) return null;
  if (d.period) return d.period;
  return d.ongoing ? `${d.year}–now` : String(d.year);
}

/** Only verified metrics ever reach the page. */
export function visibleMetrics(d: WorkData) {
  return d.metrics.filter((m) => m.verified);
}

/** "N.02" */
export function indexLabel(d: WorkData): string | null {
  return d.n ? `N.${String(d.n).padStart(2, '0')}` : null;
}

/** View-transition name for the title pair (row → H1). Unique per slug. */
export function titleVT(id: string): string {
  return `work-title-${id.replace(/[^a-z0-9-]/gi, '-')}`;
}

/** Whether an entry gets its own /work/<slug>/ page. Archive rows are list-only. */
export function hasPage(w: Work): boolean {
  return !w.data.archived;
}

export async function getWork() {
  const all = await getCollection('work');
  const featured = all.filter((w) => !w.data.archived && w.data.n).sort((a, b) => (a.data.n ?? 99) - (b.data.n ?? 99));
  const also = all.filter((w) => !w.data.archived && !w.data.n).sort((a, b) => a.data.title.localeCompare(b.data.title));
  const archive = all.filter((w) => w.data.archived).sort((a, b) => a.data.title.localeCompare(b.data.title));
  return { all, featured, also, archive, pages: [...featured, ...also] };
}
