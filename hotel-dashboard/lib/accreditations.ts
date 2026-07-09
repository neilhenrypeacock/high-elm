import { ACCREDITATIONS } from './accreditations.generated';

// Look up a hotel's accreditation labels by Instagram handle. Display-only,
// static (built from hotel-lists/*.csv by scripts/build-accreditations.mjs) —
// no DB column, no query. Handles are matched normalized (lowercase, no @).
// Coverage is partial by nature: only hotels on the Forbes / Condé Nast Gold
// List / Michelin Keys source lists carry pins; everyone else gets none.
export function accreditationsFor(handle: string | null | undefined): string[] {
  if (!handle) return [];
  const key = handle.trim().toLowerCase().replace(/^@/, '').replace(/\/+$/, '');
  return ACCREDITATIONS[key] ?? [];
}
