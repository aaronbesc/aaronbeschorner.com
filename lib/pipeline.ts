import type { Application, StatusChange } from "@/lib/applications";

// The pipeline chart's flows. Every application starts at Resume Screening
// (or at "Referral" / "Cold apply" first, split by referral), moves forward
// through stages (Interview Offered, then any further rounds), and may end
// in an outcome. The outcomes are Offer, Rejected and Ghosted, and one can
// come after any stage. Further rounds are custom statuses ("Technical
// round", "Final round"), ordered by when each was first used. The history
// is read with that in mind, so a path always makes sense:
//
// - Only the current status can be an outcome. An earlier one was changed
//   afterwards, so it was a correction, not where the application went.
// - Stages only move forward. Going back to an earlier stage undoes the
//   ones after it, also as a correction.

export const REFERRAL = "Referral";
export const COLD = "Cold apply";
export const SCREENING = "Resume Screening";
const INTERVIEW = "Interview Offered";

/** Statuses that end an application. */
export const OUTCOMES = new Set(["Offer", "Rejected", "Ghosted"]);

export type Flow = { source: string; target: string; value: number };

/** One application's path, from its statuses oldest first (current last). */
export function pathOf(statuses: string[], rank: (stage: string) => number) {
  const path = [SCREENING];
  for (const status of statuses) {
    if (OUTCOMES.has(status)) continue;
    // A stage at or before the one the path is at means it went back.
    while (path.length > 1 && rank(path.at(-1)!) >= rank(status)) path.pop();
    if (path.at(-1) !== status) path.push(status);
  }
  const current = statuses.at(-1);
  if (current && OUTCOMES.has(current)) path.push(current);
  return path;
}

export function pipeline(apps: Application[], history: StatusChange[], byReferral: boolean) {
  const statuses = new Map<number, string[]>();
  for (const { applicationId, status } of history) {
    const list = statuses.get(applicationId) ?? [];
    list.push(status);
    statuses.set(applicationId, list);
  }

  // Stage order: screening, then interviews, then custom rounds as they
  // were first used.
  const ranks = new Map([
    [SCREENING, 0],
    [INTERVIEW, 1],
  ]);
  for (const { status } of [...history, ...apps]) {
    if (!ranks.has(status) && !OUTCOMES.has(status)) ranks.set(status, ranks.size);
  }
  const rank = (stage: string) => ranks.get(stage) ?? ranks.size;

  const flows = new Map<string, Flow>();
  // How many applications reached each status, including those still there.
  const reached = new Map<string, number>();
  for (const app of apps) {
    const path = pathOf([...(statuses.get(app.id) ?? []), app.status], rank);
    const steps = byReferral ? [app.referral ? REFERRAL : COLD, ...path] : path;
    for (const [i, step] of steps.entries()) {
      reached.set(step, (reached.get(step) ?? 0) + 1);
      if (!i) continue;
      const key = `${steps[i - 1]}\u0000${step}`;
      const flow = flows.get(key) ?? { source: steps[i - 1], target: step, value: 0 };
      flow.value++;
      flows.set(key, flow);
    }
  }

  return { flows: [...flows.values()], reached };
}
