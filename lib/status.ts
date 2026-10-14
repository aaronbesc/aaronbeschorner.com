// Each status's color, shared by the tracker's pills and filter chips and
// the pipeline chart, so a status looks the same everywhere. The presets
// have fixed colors; a custom status gets one picked from its name, so it
// keeps it. Chart colors are --status-* in globals.css (light and dark
// steps, checked for color-blind separation); every place a color appears
// also shows the status's name, so color never carries it alone.

/** Pill classes, written out in full so Tailwind finds them, and the chart color. */
const TONES = {
  blue: ["bg-sky-100 text-sky-800 dark:bg-sky-400/15 dark:text-sky-300", "var(--status-blue)"],
  yellow: [
    "bg-amber-100 text-amber-800 dark:bg-amber-400/15 dark:text-amber-300",
    "var(--status-yellow)",
  ],
  aqua: [
    "bg-emerald-100 text-emerald-800 dark:bg-emerald-400/15 dark:text-emerald-300",
    "var(--status-aqua)",
  ],
  red: ["bg-rose-100 text-rose-800 dark:bg-rose-400/15 dark:text-rose-300", "var(--status-red)"],
  gray: [
    "bg-stone-200 text-stone-700 dark:bg-stone-400/15 dark:text-stone-300",
    "var(--status-gray)",
  ],
  violet: [
    "bg-violet-100 text-violet-800 dark:bg-violet-400/15 dark:text-violet-300",
    "var(--status-violet)",
  ],
  magenta: [
    "bg-pink-100 text-pink-800 dark:bg-pink-400/15 dark:text-pink-300",
    "var(--status-magenta)",
  ],
  orange: [
    "bg-orange-100 text-orange-800 dark:bg-orange-400/15 dark:text-orange-300",
    "var(--status-orange)",
  ],
} as const;
type Tone = keyof typeof TONES;

const PRESET_TONES: Record<string, Tone> = {
  "Resume Screening": "blue",
  "Interview Offered": "yellow",
  Offer: "aqua",
  Rejected: "red",
  Ghosted: "gray",
};
const CUSTOM_TONES: Tone[] = ["violet", "magenta", "orange"];

function toneOf(status: string): Tone {
  if (status in PRESET_TONES) return PRESET_TONES[status];
  let hash = 0;
  for (const char of status.toLowerCase()) hash = (hash * 31 + char.charCodeAt(0)) | 0;
  return CUSTOM_TONES[Math.abs(hash) % CUSTOM_TONES.length];
}

/** Classes for a status pill. */
export const pillClass = (status: string) => TONES[toneOf(status)][0];

/** A status's color for marks: chart nodes, links and dots. */
export const statusColor = (status: string) => TONES[toneOf(status)][1];
