export type Contributions = {
  total: number;
  /** One column per week (Sunday first), each day's level 0–4; -1 pads the edges. */
  weeks: number[][];
};

/** Last year of GitHub contributions, or null if the service is unavailable. */
export async function getContributions(
  user: string,
): Promise<Contributions | null> {
  try {
    const res = await fetch(
      `https://github-contributions-api.jogruber.de/v4/${user}?y=last`,
      { next: { revalidate: 86400 } },
    );
    if (!res.ok) return null;
    const data: {
      total: { lastYear?: number };
      contributions: { date: string; level: number }[];
    } = await res.json();
    const days = data.contributions;
    if (days.length === 0) return null;

    const weeks: number[][] = [];
    const firstDay = new Date(`${days[0].date}T00:00:00Z`).getUTCDay();
    let week: number[] = Array(firstDay).fill(-1);
    for (const day of days) {
      week.push(day.level);
      if (week.length === 7) {
        weeks.push(week);
        week = [];
      }
    }
    if (week.length > 0) weeks.push([...week, ...Array(7 - week.length).fill(-1)]);

    return { total: data.total.lastYear ?? 0, weeks };
  } catch {
    return null;
  }
}
