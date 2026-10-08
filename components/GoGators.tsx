"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import type confetti from "canvas-confetti";
import { useDictionary } from "./Locale";

const CHANT = "/audio/go_gators.mp3";

// Seconds into the chant where the party colors swap: a steady pulse through
// the long "GOOO", then "GA" and "TORS", which also fire a confetti cannon
// from each side.
const BEATS: { at: number; cannon?: { x: number; angle: number } }[] = [
  { at: 0.55 },
  { at: 1.1 },
  { at: 1.65 },
  { at: 2.3, cannon: { x: 0, angle: 60 } },
  { at: 2.55, cannon: { x: 1, angle: 120 } },
];
// UF orange and blue; keep in sync with globals.css.
const COLORS = ["#fa4616", "#0021a5"];

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
  const { gators: t } = useDictionary();
  const audio = useRef<HTMLAudioElement | null>(null);
  const cannon = useRef<Promise<typeof confetti> | null>(null);
  const frame = useRef(0);
  const [playing, setPlaying] = useState(false);

  // Follow the audio's own clock so the beats stay in sync even if playback
  // stalls to buffer.
  function sync(chant: HTMLAudioElement) {
    const root = document.documentElement;
    const calm = matchMedia("(prefers-reduced-motion: reduce)").matches;
    let beat = 0;
    root.dataset.party = "a";
    cancelAnimationFrame(frame.current);
    const tick = () => {
      for (; beat < BEATS.length && chant.currentTime >= BEATS[beat].at; beat++) {
        if (!calm) root.dataset.party = beat % 2 ? "a" : "b";
        const shot = BEATS[beat].cannon;
        if (shot) {
          cannon.current?.then((fire) =>
            fire({
              particleCount: 80,
              angle: shot.angle,
              spread: 60,
              startVelocity: 55,
              origin: { x: shot.x, y: 0.8 },
              colors: COLORS,
              disableForReducedMotion: true,
            }),
          );
        }
      }
      frame.current = requestAnimationFrame(tick);
    };
    tick();
  }

  function stop() {
    cancelAnimationFrame(frame.current);
    delete document.documentElement.dataset.party;
    setPlaying(false);
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
      setPlaying(true);
      sync(chant);
    });
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
      title={playing ? t.stop : t.play}
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
