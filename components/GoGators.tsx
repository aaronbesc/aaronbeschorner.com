"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

const CHANT = "/audio/go_gators.mp3";

/**
 * Easter egg: plays the "Go Gators" chant and throws an orange-and-blue
 * party for as long as it lasts. While it plays, <html data-party> turns on
 * every party: style (see globals.css). Clicking again stops it.
 */
export default function GoGators({
  className = "",
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  const audio = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);

  // Created on hover/focus so the file is already loading by the click.
  function load() {
    if (audio.current) return audio.current;
    const chant = new Audio(CHANT);
    chant.preload = "auto";
    // The party follows the audio itself, so it starts in sync even if the
    // file is still loading when clicked.
    chant.addEventListener("playing", () => {
      document.documentElement.dataset.party = "gators";
      setPlaying(true);
    });
    const stop = () => {
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
