import type { Application, StatusChange } from "@/lib/applications";

// The pipeline chart's flows: every application starts at "Applied" (or
// "Referral" / "Cold", split by referral), then moves through the statuses
// it has been in, oldest first, and ends at its current one.

export const APPLIED = "Applied";
export const REFERRAL = "Referral";
export const COLD = "Cold apply";

export type Flow = { source: string; target: string; value: number };

/**
 * One application's path through its statuses. Going back to a status it
 * was already in counts as undoing what came after (usually a mistake
 * corrected), so a path never visits a status twice, and it always ends at
 * the current status.
 */
export function pathOf(app: Application, history: string[]) {
  const path: string[] = [];
  for (const status of [...history, app.status]) {
    const seen = path.indexOf(status);
    if (seen >= 0) path.length = seen + 1;
    else path.push(status);
  }
  return path;
}

export function pipeline(
  apps: Application[],
  history: StatusChange[],
  byReferral: boolean,
) {
  const statuses = new Map<number, string[]>();
  for (const { applicationId, status } of history) {
    const list = statuses.get(applicationId) ?? [];
    list.push(status);
    statuses.set(applicationId, list);
  }

  const values = new Map<string, Flow>();
  const next = new Map<string, Set<string>>(); // edges so far, to keep out loops

  // Whether `to` already leads back to `from`, so an edge between them
  // would make a loop.
  const loops = (from: string, to: string) => {
    const stack = [to];
    const seen = new Set<string>();
    while (stack.length) {
      const node = stack.pop()!;
      if (node === from) return true;
      if (seen.has(node)) continue;
      seen.add(node);
      stack.push(...(next.get(node) ?? []));
    }
    return false;
  };

  for (const app of apps) {
    const start = byReferral ? (app.referral ? REFERRAL : COLD) : APPLIED;
    let from = start;
    for (const to of pathOf(app, statuses.get(app.id) ?? [])) {
      const key = `${from}\u0000${to}`;
      if (!values.has(key)) {
        // Two applications that went from A to B and from B to A can't both
        // be drawn left to right; the later one stops at A.
        if (loops(from, to)) break;
        next.set(from, (next.get(from) ?? new Set()).add(to));
        values.set(key, { source: from, target: to, value: 0 });
      }
      values.get(key)!.value++;
      from = to;
    }
  }

  return [...values.values()];
}
