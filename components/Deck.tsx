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

const DURATION = 450; // ms; matches duration-450 below.

type DeckState = {
  index: number;
  count: number;
  leaving: number | null;
  entering: number | null;
  next: () => void;
  prev: () => void;
};

const DeckContext = createContext<DeckState | null>(null);

function useDeck() {
  const deck = use(DeckContext);
  if (!deck) throw new Error("Deck components must be rendered inside <Deck>");
  return deck;
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
  const busy = useRef(false);

  // Ignore input while a card is mid-animation.
  function begin() {
    if (busy.current || count < 2) return false;
    busy.current = true;
    setTimeout(() => {
      busy.current = false;
    }, DURATION);
    return true;
  }

  function next() {
    if (!begin()) return;
    setLeaving(index);
    setIndex((index + 1) % count);
    setTimeout(() => setLeaving(null), DURATION);
  }

  function prev() {
    if (!begin()) return;
    const target = (index - 1 + count) % count;
    // Park the card above the stack first, then let it slide down into place.
    setEntering(target);
    requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        setEntering(null);
        setIndex(target);
      }),
    );
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
    <DeckContext value={{ index, count, leaving, entering, next, prev }}>
      {children}
    </DeckContext>
  );
}

// Resting pose of the cards behind the front one, from the Figma design:
// each layer is narrower, peeks out further below, and has its own color.
// During the Go Gators party they light up in orange and blue (gators-layer).
const LAYERS = [
  {
    transform: "translateY(5.6%) scaleX(0.9)",
    bg: "bg-stack gators-layer",
    z: 30,
  },
  {
    transform: "translateY(10.2%) scaleX(0.808)",
    bg: "bg-accent gators-layer gators-alt",
    z: 20,
  },
];
const OFFSTAGE = "translateY(-110%)";

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
  const { index, count, leaving, entering, next, prev } = useDeck();
  const [drag, setDrag] = useState(0);
  const [dragging, setDragging] = useState(false);
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
          (card plus the layers peeking 10.2% below) fits on screen. Below lg
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

          let transform = `translateY(${drag}px)`;
          let bg = "bg-surface";
          let z = 40;
          let opacity = 1;
          if (flying) {
            transform = OFFSTAGE;
            z = 50;
            opacity = 0;
          } else if (depth > 0) {
            const layer = LAYERS[Math.min(depth, LAYERS.length) - 1];
            transform = layer.transform;
            bg = layer.bg;
            z = depth > LAYERS.length ? 10 : layer.z;
            opacity = depth > LAYERS.length ? 0 : 1;
          }
          const animate = i !== entering && !(front && dragging);

          return (
            <div
              key={i}
              role="group"
              aria-roledescription="slide"
              aria-label={`${i + 1} de ${count}`}
              inert={!front}
              className={`@container absolute inset-0 overflow-hidden rounded-[20px] md:rounded-[24px] ${bg} ${animate ? "transition-[transform,opacity,background-color] duration-450 ease-[cubic-bezier(0.2,0.8,0.2,1)] motion-reduce:transition-none" : ""}`}
              style={{ transform, opacity, zIndex: z }}
            >
              <div
                className={`size-full transition-opacity duration-300 ${front || flying ? "opacity-100" : "opacity-0"}`}
              >
                {card}
              </div>
            </div>
          );
        })}
        <p className="sr-only" aria-live="polite">
          {index + 1} de {count}
        </p>
      </div>
    </div>
  );
}

export function DeckPager({ className = "" }: { className?: string }) {
  const { index, count, next } = useDeck();
  return (
    <button
      type="button"
      onClick={next}
      aria-label="Next card"
      className={`h-9 w-36 cursor-pointer rounded-full border border-muted pl-4 text-left text-[14px] text-muted transition-colors hover:border-ink hover:text-ink ${className}`}
    >
      {index + 1} de {count}
    </button>
  );
}
