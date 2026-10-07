"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import type confetti from "canvas-confetti";

const CHANT = "/audio/go_gators.mp3";

// Loudness of the chant every 50ms, 0 (quiet) to 1 (loudest shout), measured
// from the audio file. Drives --beat so the party pulses with the crowd:
// a long "GOOO", a dip, then "GA" (2.30s) and "TORS" (2.55s).
const ENVELOPE = [
  0.69, 0.87, 0.82, 0.92, 0.83, 0.84, 0.8, 0.92, 0.9, 0.8, 0.72, 0.76, 0.75,
  0.81, 0.81, 0.97, 0.93, 0.78, 0.65, 0.77, 0.76, 0.73, 0.79, 0.84, 0.78, 0.8,
  0.69, 0.68, 0.62, 0.61, 0.91, 0.81, 0.73, 0.72, 0.67, 0.66, 0.59, 0.56,
  0.52, 0.46, 0.41, 0.33, 0.27, 0.12, 0.02, 0.35, 0.81, 0.71, 0.61, 0.48,
  0.46, 0.88, 0.83, 0.66, 0.59, 0.51, 0.51, 0.41, 0.34, 0.06, 0, 0,
];
const STEP = 0.05;

// Confetti cannons fire from each side on "GA" and "TORS".
const BURSTS = [
  { at: 2.3, x: 0, angle: 60 },
  { at: 2.55, x: 1, angle: 120 },
];
// UF orange and blue; keep in sync with globals.css.
const COLORS = ["#fa4616", "#0021a5"];

function beatAt(time: number) {
  const i = time / STEP;
  const lo = Math.floor(i);
  if (lo >= ENVELOPE.length - 1) return 0;
  return ENVELOPE[lo] + (ENVELOPE[lo + 1] - ENVELOPE[lo]) * (i - lo);
}

/**
 * Easter egg: plays the "Go Gators" chant and throws an orange-and-blue
 * party for as long as it lasts. While it plays, <html data-party> turns on
 * every gators-* style (see globals.css). Clicking again stops it.
 */
export default function GoGators({
  className = "",
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  const audio = useRef<HTMLAudioElement | null>(null);
  const cannon = useRef<Promise<typeof confetti> | null>(null);
  const frame = useRef(0);
  const [playing, setPlaying] = useState(false);

  // Follow the audio's own clock so the visuals stay in sync even if
  // playback stalls to buffer.
  function sync(chant: HTMLAudioElement) {
    const root = document.documentElement;
    const calm = matchMedia("(prefers-reduced-motion: reduce)").matches;
    let burst = 0;
    cancelAnimationFrame(frame.current);
    const tick = () => {
      const t = chant.currentTime;
      if (!calm) root.style.setProperty("--beat", beatAt(t).toFixed(3));
      for (; burst < BURSTS.length && t >= BURSTS[burst].at; burst++) {
        const { x, angle } = BURSTS[burst];
        cannon.current?.then((fire) =>
          fire({
            particleCount: 80,
            angle,
            spread: 60,
            startVelocity: 55,
            origin: { x, y: 0.8 },
            colors: COLORS,
            disableForReducedMotion: true,
          }),
        );
      }
      frame.current = requestAnimationFrame(tick);
    };
    tick();
  }

  // Created on hover/focus so everything is loading by the time of the click.
  function load() {
    cannon.current ??= import("canvas-confetti").then((m) => m.default);
    if (audio.current) return audio.current;
    const chant = new Audio(CHANT);
    chant.preload = "auto";
    // The party follows the audio itself, so it starts in sync even if the
    // file is still loading when clicked.
    chant.addEventListener("playing", () => {
      document.documentElement.dataset.party = "gators";
      setPlaying(true);
      sync(chant);
    });
    const stop = () => {
      cancelAnimationFrame(frame.current);
      document.documentElement.style.removeProperty("--beat");
      delete document.documentElement.dataset.party;
      setPlaying(false);
    };
    chant.addEventListener("pause", stop);
    chant.addEventListener("ended", stop);
    audio.current = chant;
    return chant;
  }

  function toggle() {
    const chant = load();
    if (!chant.paused) {
      chant.pause();
      return;
    }
    chant.currentTime = 0;
    // If playback is blocked or the file fails to load, there's no party.
    chant.play().catch(() => {});
  }

  useEffect(() => {
    return () => {
      audio.current?.pause();
      cancelAnimationFrame(frame.current);
      document.documentElement.style.removeProperty("--beat");
      delete document.documentElement.dataset.party;
    };
  }, []);

  // A span rather than a <button> so the words keep wrapping like the rest
  // of the sentence.
  return (
    <span
      role="button"
      tabIndex={0}
      aria-pressed={playing}
      title={playing ? "Stop the chant" : "Go Gators!"}
      onPointerEnter={() => load()}
      onFocus={() => load()}
      onClick={toggle}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          toggle();
        }
      }}
      className={`cursor-pointer rounded-sm ${className}`}
    >
      {children}
    </span>
  );
}
