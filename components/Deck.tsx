"use client";

import {
  createContext,
  use,
  useEffect,
  useEffectEvent,
  useRef,
  useState,
  type PointerEvent,
  type ReactNode,
} from "react";
import { flushSync } from "react-dom";
import MaskIcon from "./MaskIcon";

const DURATION = 450; // ms, for one card
const QUICK = 260; // ms per card when jumping across several

type DeckState = {
  index: number;
  count: number;
  leaving: number | null;
  entering: number | null;
  /** How long the current move takes, in ms. */
  duration: number;
  next: () => void;
  prev: () => void;
  /** Goes to a card, passing through the ones in between. */
  go: (target: number) => void;
};

const DeckContext = createContext<DeckState | null>(null);

function useDeck() {
  const deck = use(DeckContext);
  if (!deck) throw new Error("Deck components must be rendered inside <Deck>");
  return deck;
}

const FrontCardContext = createContext(true);

/** Whether the card this is rendered in is the one in front. */
export function useIsFrontCard() {
  return use(FrontCardContext);
}

/** Holds which card is in front; shared by the cards and the pager. */
export function Deck({
  count,
  children,
}: {
  count: number;
  children: ReactNode;
}) {
  const [index, setIndex] = useState(0);
  const [leaving, setLeaving] = useState<number | null>(null);
  const [entering, setEntering] = useState<number | null>(null);
  const [duration, setDuration] = useState(DURATION);
  // The index as of the latest step, for the timers of a jump.
  const current = useRef(0);
  const busy = useRef(false);

  // One card forward (the front card flies off the top) or back (the
  // previous card is parked above the stack, then slides down into place).
  function step(dir: 1 | -1) {
    const from = current.current;
    const to = (from + dir + count) % count;
    current.current = to;
    if (dir > 0) {
      setLeaving(from);
      setIndex(to);
    } else {
      flushSync(() => setEntering(to));
      // Make the browser take in the parked position now, so the slide
      // starts there rather than from the card's place at the back.
      document.body.getBoundingClientRect();
      setEntering(null);
      setIndex(to);
    }
  }

  // Moves several cards one after the other, like that many quick swipes,
  // ignoring input until the last one lands.
  function run(dir: 1 | -1, steps: number) {
    if (busy.current || count < 2 || steps < 1) return;
    busy.current = true;
    const ms = steps > 1 ? QUICK : DURATION;
    setDuration(ms);
    let left = steps;
    const tick = () => {
      step(dir);
      left -= 1;
      setTimeout(left > 0 ? tick : done, ms);
    };
    const done = () => {
      setLeaving(null);
      busy.current = false;
    };
    tick();
  }

  const next = () => run(1, 1);
  const prev = () => run(-1, 1);

  // Later cards are ahead (swipes up), earlier ones behind (swipes down).
  function go(target: number) {
    const distance = target - current.current;
    if (!distance || busy.current) return;
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) {
      current.current = target;
      setIndex(target);
      return;
    }
    run(distance > 0 ? 1 : -1, Math.abs(distance));
  }

  const onKeyDown = useEffectEvent((e: KeyboardEvent) => {
    if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.altKey) return;
    const el = e.target as HTMLElement;
    if (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName)) {
      return;
    }
    if (["ArrowDown", "PageDown", "j"].includes(e.key)) {
      e.preventDefault();
      next();
    } else if (["ArrowUp", "PageUp", "k"].includes(e.key)) {
      e.preventDefault();
      prev();
    }
  });

  useEffect(() => {
    const handler = (e: KeyboardEvent) => onKeyDown(e);
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  return (
    <DeckContext
      value={{ index, count, leaving, entering, duration, next, prev, go }}
    >
      {children}
    </DeckContext>
  );
}

// Resting pose by depth: the front card, then the cards behind it, each a
// little smaller and lower so its bottom peeks out (5.6% and 10.2% of the
// card, from the Figma design) and slightly dimmed. Their content stays
// visible, so the next card is already there when it comes forward.
const POSES = [
  { y: 0, scale: 1, dim: 0 },
  { y: 0.106, scale: 0.9, dim: 0.04 },
  { y: 0.198, scale: 0.808, dim: 0.08 },
];
// During the Go Gators party the cards behind light up in orange and blue.
const PARTY = ["", "gators-layer", "gators-layer gators-alt"];
const OFFSTAGE = "translateY(-110%)";
const EASE = "ease-[cubic-bezier(0.2,0.8,0.2,1)] motion-reduce:transition-none";

/**
 * The card stack. Swipe (or drag) up for the next card and down for the
 * previous one; mouse wheels, trackpads and arrow keys work too.
 */
export function DeckCards({
  cards,
  label,
}: {
  cards: ReactNode[];
  label: string;
}) {
  const { index, count, leaving, entering, duration, next, prev } = useDeck();
  const [drag, setDrag] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [height, setHeight] = useState(1);
  const area = useRef<HTMLDivElement>(null);
  const gesture = useRef<{
    id: number;
    startY: number;
    startT: number;
    active: boolean;
  } | null>(null);
  const suppressClick = useRef(false);
  const wheel = useRef({ last: 0, sum: 0, spent: false });

  const onWheel = useEffectEvent((e: WheelEvent) => {
    if (e.ctrlKey || Math.abs(e.deltaY) <= Math.abs(e.deltaX)) return;
    e.preventDefault();
    const w = wheel.current;
    // Trackpads keep firing momentum events after a flick; treat everything
    // until a short pause as one gesture so one flick moves one card.
    if (e.timeStamp - w.last > 200) {
      w.sum = 0;
      w.spent = false;
    }
    w.last = e.timeStamp;
    if (w.spent) return;
    w.sum += e.deltaMode === 1 ? e.deltaY * 16 : e.deltaY;
    if (Math.abs(w.sum) >= 40) {
      w.spent = true;
      if (w.sum > 0) next();
      else prev();
    }
  });

  useEffect(() => {
    const el = area.current;
    if (!el) return;
    const handler = (e: WheelEvent) => onWheel(e);
    el.addEventListener("wheel", handler, { passive: false });
    return () => el.removeEventListener("wheel", handler);
  }, []);

  function onPointerDown(e: PointerEvent<HTMLDivElement>) {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    suppressClick.current = false;
    gesture.current = {
      id: e.pointerId,
      startY: e.clientY,
      startT: e.timeStamp,
      active: false,
    };
  }

  function onPointerMove(e: PointerEvent<HTMLDivElement>) {
    const g = gesture.current;
    if (!g || g.id !== e.pointerId) return;
    const dy = e.clientY - g.startY;
    if (!g.active) {
      // Small movements are taps on the links and buttons inside the card.
      if (Math.abs(dy) < 8) return;
      g.active = true;
      setDragging(true);
      setHeight(e.currentTarget.offsetHeight);
      e.currentTarget.setPointerCapture(e.pointerId);
    }
    // Pulling down only hints at the previous card, so it resists.
    setDrag(dy < 0 ? dy : dy * 0.35);
  }

  function onPointerUp(e: PointerEvent<HTMLDivElement>) {
    const g = gesture.current;
    gesture.current = null;
    if (!g?.active) return;
    suppressClick.current = true;
    setDragging(false);
    setDrag(0);
    const dy = e.clientY - g.startY;
    const velocity = dy / Math.max(1, e.timeStamp - g.startT);
    const threshold = e.currentTarget.offsetHeight * 0.18;
    if (dy < -threshold || velocity < -0.5) next();
    else if (dy > threshold || velocity > 0.5) prev();
  }

  function onPointerCancel() {
    gesture.current = null;
    setDragging(false);
    setDrag(0);
  }

  return (
    <div
      ref={area}
      className="flex items-center justify-center lg:size-full lg:[container-type:size]"
    >
      {/* --w is the card width: as wide as possible while the whole stack
          (card plus the cards peeking 10.2% below) fits on screen. Below lg
          that leaves ~260px for the header and footer; on lg the card fills
          whatever height <main> gets. */}
      <div
        role="region"
        aria-roledescription="carousel"
        aria-label={label}
        className="relative mb-[calc(var(--w)*0.102)] aspect-square w-(--w) touch-none select-none [--w:min(100vw_-_2rem,26rem,calc((100dvh_-_260px)/1.11))] md:mb-[calc(var(--w)/1.7*0.102)] md:aspect-[1.7] md:[--w:min(100vw_-_2rem,46rem,calc((100dvh_-_260px)*1.7/1.11))] lg:[--w:min(100cqw,46rem,calc(100cqh*1.7/1.11))]"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerCancel}
        onDragStart={(e) => e.preventDefault()}
        onClickCapture={(e) => {
          if (!suppressClick.current) return;
          suppressClick.current = false;
          e.preventDefault();
          e.stopPropagation();
        }}
      >
        {cards.map((card, i) => {
          const depth = (i - index + count) % count;
          const flying = i === leaving || i === entering;
          const front = depth === 0 && i !== entering;
          // While the front card is dragged up, the cards behind move up a
          // place in proportion, so the next one follows the finger.
          const progress = dragging && drag < 0 ? Math.min(1, -drag / (height * 0.6)) : 0;

          let transform = `translateY(${drag}px)`;
          let z = 40;
          let opacity = 1;
          let dim = 0;
          let party = "";
          if (flying) {
            transform = OFFSTAGE;
            z = 50;
            opacity = 0;
          } else if (depth > 0) {
            const d = Math.min(depth, POSES.length - 1);
            const from = POSES[d];
            const to = depth < POSES.length ? POSES[d - 1] : from;
            const mix = (a: number, b: number) => a + (b - a) * progress;
            transform = `translateY(${mix(from.y, to.y) * 100}%) scale(${mix(from.scale, to.scale)})`;
            dim = mix(from.dim, to.dim);
            z = 40 - depth * 10;
            // Cards deeper than the stack wait, hidden, in the last slot.
            opacity = depth < POSES.length ? 1 : progress;
            party = PARTY[d];
          }
          const animate = i !== entering && !dragging;
          // Only with a transition set: alone it would animate everything.
          const transitionDuration = animate ? `${duration}ms` : undefined;

          return (
            <div
              key={i}
              role="group"
              aria-roledescription="slide"
              aria-label={`${i + 1} of ${count}`}
              inert={!front}
              className={`@container absolute inset-0 overflow-hidden rounded-[20px] bg-surface shadow-[0_1px_2px_rgb(0_0_0/0.05),0_10px_28px_-16px_rgb(0_0_0/0.25)] md:rounded-[24px] dark:ring-1 dark:ring-white/[0.06] ${party} ${animate ? `transition-[transform,opacity] ${EASE}` : ""}`}
              style={{
                transform,
                opacity,
                zIndex: z,
                transitionDuration,
              }}
            >
              <div className="size-full">
                <FrontCardContext value={front}>{card}</FrontCardContext>
              </div>
              <div
                aria-hidden
                className={`pointer-events-none absolute inset-0 bg-black ${animate ? `transition-opacity ${EASE}` : ""}`}
                style={{ opacity: dim, transitionDuration }}
              />
            </div>
          );
        })}
        <p className="sr-only" aria-live="polite">
          {index + 1} of {count}
        </p>
      </div>
    </div>
  );
}

// The pager pill (w-36 by h-9, with a 1px border), in px.
const PILL = { w: 142, h: 34 };
const DOT = 24;
const INSET = (PILL.h - DOT) / 2;
const OVERLAP = 14; // offset between stacked circles

/**
 * "1 of 4" plus a circle per card, stacked at the end of the pill. Hovering
 * (or tapping the circles, on touch) fans them out across the pill so any
 * card is one click away.
 */
export function DeckPager({
  pages,
  className = "",
}: {
  pages: { label: string; icon: string }[];
  className?: string;
}) {
  const { index, count, next, go } = useDeck();
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [tapped, setTapped] = useState(false);
  const open = hovered || focused || tapped;
  const root = useRef<HTMLDivElement>(null);

  // On touch, a tap anywhere else folds them back up.
  useEffect(() => {
    if (!tapped) return;
    const close = (e: globalThis.PointerEvent) => {
      if (!root.current?.contains(e.target as Node)) setTapped(false);
    };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, [tapped]);

  const n = pages.length;
  const spread = (PILL.w - 2 * INSET - DOT) / Math.max(1, n - 1);

  return (
    <div
      ref={root}
      role="group"
      aria-label="Cards"
      className={`relative h-9 w-36 rounded-full border transition-colors ${open ? "border-ink" : "border-muted hover:border-ink"} ${className}`}
      onPointerEnter={(e) => {
        if (e.pointerType === "mouse") setHovered(true);
      }}
      onPointerLeave={(e) => {
        if (e.pointerType === "mouse") setHovered(false);
      }}
      onFocus={(e) => setFocused(e.target.matches("[data-page]:focus-visible"))}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) setFocused(false);
      }}
    >
      <button
        type="button"
        onClick={next}
        aria-label="Next card"
        className="absolute inset-0 cursor-pointer rounded-full pl-4 text-left text-[14px] text-muted transition-colors hover:text-ink"
      >
        <span
          className={`transition-opacity duration-200 ${open ? "opacity-0" : ""}`}
        >
          {index + 1} of {count}
        </span>
      </button>

      {pages.map((page, i) => {
        const current = i === index;
        // Stacked at the end, or spread evenly across the pill.
        const x = open
          ? INSET + i * spread
          : PILL.w - INSET - DOT - (n - 1 - i) * OVERLAP;
        return (
          <button
            key={i}
            type="button"
            data-page
            aria-label={`${page.label}, ${i + 1} of ${n}`}
            aria-current={current || undefined}
            onClick={() => {
              // On touch the first tap fans the circles out to choose from.
              if (open) {
                setTapped(false);
                go(i);
              } else {
                setTapped(true);
              }
            }}
            className={`absolute top-0 left-0 flex size-6 cursor-pointer items-center justify-center rounded-full border transition-[translate,color,background-color,border-color] duration-300 ease-[cubic-bezier(0.2,0.8,0.2,1)] motion-reduce:transition-none ${
              current
                ? "border-ink bg-ink text-canvas"
                : "border-muted bg-canvas text-muted hover:border-ink hover:text-ink"
            }`}
            style={{
              translate: `${x}px ${INSET}px`,
              // The current card's circle on top, the rest under it by
              // distance, like the cards in the deck.
              zIndex: n - Math.abs(i - index),
            }}
          >
            <MaskIcon src={page.icon} className="size-3" />
          </button>
        );
      })}
    </div>
  );
}
