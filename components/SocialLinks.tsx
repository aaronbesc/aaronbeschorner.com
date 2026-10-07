"use client";

import {
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent,
  type ReactNode,
} from "react";
import MaskIcon from "./MaskIcon";

// Inspired by the contact previews on colinlienard.com (MIT, © Colin Lienard).

export type Social = {
  name: string;
  href: string;
  icon: string;
  iconClass: string;
  /** Card shown above the icon on hover. */
  preview: ReactNode;
};

type Shown = { index: number; id: number; dir: number };

const SLIDE = 300; // ms; matches the preview-in/out animations.

/**
 * Social icons. Hovering one with a mouse opens a preview card above it;
 * moving to the next icon slides the card over and resizes it to fit.
 */
export default function SocialLinks({ items }: { items: Social[] }) {
  const [open, setOpen] = useState(false);
  const [left, setLeft] = useState(0);
  const [current, setCurrent] = useState<Shown | null>(null);
  const [leaving, setLeaving] = useState<Shown | null>(null);
  // Opening appears in place; only moving between icons slides.
  const [instant, setInstant] = useState(true);
  const box = useRef<HTMLDivElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  function show(index: number, e: PointerEvent<HTMLElement>) {
    if (e.pointerType !== "mouse") return;
    const icon = e.currentTarget;
    setLeft(icon.offsetLeft + icon.offsetWidth / 2);
    setInstant(!open);
    setOpen(true);
    if (open && current?.index === index) return;

    setLeaving(open ? current : null);
    setCurrent({
      index,
      id: (current?.id ?? 0) + 1,
      dir: open && current ? Math.sign(index - current.index) : 0,
    });
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setLeaving(null), SLIDE);
  }

  // The card takes the height of whichever preview is coming in.
  function fit(preview: HTMLDivElement | null) {
    if (preview && box.current) box.current.style.height = `${preview.offsetHeight}px`;
  }

  return (
    <div
      className="relative flex items-center gap-[1em]"
      onPointerLeave={() => setOpen(false)}
    >
      {items.map(({ name, href, icon, iconClass }, i) => (
        <a
          key={name}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={name}
          onPointerEnter={(e) => show(i, e)}
          className="flex text-muted transition-colors hover:text-ink focus-visible:text-ink"
        >
          <MaskIcon src={icon} className={iconClass} />
        </a>
      ))}

      <div
        ref={box}
        aria-hidden
        inert={!open}
        style={{ left }}
        className={`absolute bottom-[calc(100%+0.75em)] z-10 w-72 -translate-x-1/2 overflow-hidden rounded-2xl bg-white text-left text-[13px] leading-normal text-ink shadow-[0_16px_40px_-12px_rgb(0_0_0/0.25)] duration-300 ease-out motion-reduce:transition-none ${
          instant ? "transition-[opacity,scale]" : "transition-[left,height,opacity,scale]"
        } ${open ? "" : "pointer-events-none scale-95 opacity-0"}`}
      >
        {leaving && (
          <div
            key={leaving.id}
            className="absolute inset-x-0 bottom-0 animate-preview-out motion-reduce:hidden"
            style={{ "--dir": current?.dir ?? 0 } as CSSProperties}
          >
            {items[leaving.index].preview}
          </div>
        )}
        {current && (
          <div
            key={current.id}
            ref={fit}
            className="absolute inset-x-0 bottom-0 animate-preview-in motion-reduce:animate-none"
            style={{ "--dir": current.dir } as CSSProperties}
          >
            {items[current.index].preview}
          </div>
        )}
      </div>

      {/* Bridges the gap so the pointer can reach the card's buttons. */}
      {open && <div className="absolute inset-x-0 bottom-full h-[0.75em]" />}
    </div>
  );
}
