"use client";

import Image from "next/image";
import {
  useEffect,
  useEffectEvent,
  useRef,
  useState,
  useSyncExternalStore,
  type RefObject,
} from "react";
import type { Tool } from "@/lib/stack";
import { useIsFrontCard } from "./Deck";

// A claw machine: the tools are capsules in a glass tank. They drop in and
// pile up under gravity; hovering the card lines them up in two rows, and
// hovering one keeps it in color while the claw comes down over it.

const STEP = 1 / 120; // fixed physics step, in seconds
const ROWS = 2;
const CLAW_HEIGHT = 18; // px, the claw drawing below the cable

type Body = {
  x: number;
  y: number;
  /** Previous position (Verlet integration: velocity = position − previous). */
  px: number;
  py: number;
  angle: number;
  /** Last drawn position, to tell when everything has come to rest. */
  lx: number;
  ly: number;
};

type Parts = {
  capsules: RefObject<(HTMLLIElement | null)[]>;
  claw: RefObject<HTMLDivElement | null>;
  cable: RefObject<HTMLSpanElement | null>;
};

/**
 * The physics, outside React since it changes every frame: Verlet
 * integration with gravity, capsule collisions, walls and floor friction,
 * drawn straight to the elements. It sleeps once everything is still.
 */
class TankEngine {
  bodies: Body[] = [];
  w = 0;
  h = 0;
  r = 0;
  sorted = false;
  hovered = -1;
  pointerX = -1;
  private clawX = -1;
  private clawDrawnX = -1;
  private clawDrop = 0;
  private raf = 0;
  private last = 0;
  private acc = 0;
  private still = 0;

  constructor(
    private count: number,
    private parts: Parts,
    /** Reduced motion: skip the physics and keep the capsules lined up. */
    private calm: boolean,
  ) {}

  /** Where capsule i sits when lined up: two centered rows. */
  private slot(i: number) {
    const cols = Math.ceil(this.count / ROWS);
    const row = Math.floor(i / cols);
    const inRow = row === 0 ? cols : this.count - cols;
    const span = Math.min(this.r * 2.9, (this.w * 0.88 - 2 * this.r) / (cols - 1));
    const gap = span * 0.95;
    return {
      x: this.w / 2 + (i - row * cols - (inRow - 1) / 2) * span,
      y: this.h * 0.58 - gap / 2 + row * gap,
    };
  }

  /** Fits the tank's size, scaling everything already in it. */
  measure(width: number, height: number) {
    if (this.w) {
      for (const b of this.bodies) {
        b.x *= width / this.w;
        b.px *= width / this.w;
        b.y *= height / this.h;
        b.py *= height / this.h;
      }
    }
    this.w = width;
    this.h = height;
    this.r = Math.max(10, Math.min(width * 0.05, height * 0.11));
    for (const c of this.parts.capsules.current) {
      if (c) c.style.width = c.style.height = `${2 * this.r}px`;
    }
    if (this.clawX < 0) this.clawX = width / 2;
  }

  /** Fills the tank: raining in from above, or already lined up. */
  fill(dropIn: boolean) {
    this.bodies = Array.from({ length: this.count }, (_, i) => {
      if (dropIn && !this.calm) {
        const x = this.r + Math.random() * (this.w - 2 * this.r);
        const y = -this.r * (1.5 + i * 1.4);
        return { x, y, px: x + (Math.random() - 0.5) * 2, py: y - 2, angle: Math.random() * 6.28, lx: 0, ly: 0 };
      }
      const t = this.slot(i);
      return { x: t.x, y: t.y, px: t.x, py: t.y, angle: 0, lx: 0, ly: 0 };
    });
    this.draw();
  }

  sort(on: boolean) {
    this.sorted = on;
    if (!on) {
      this.hovered = -1;
      // Let go with a tiny nudge each, so they don't fall in lockstep.
      for (const b of this.bodies) {
        b.px = b.x + (Math.random() - 0.5) * 1.5;
        b.py = b.y + 0.5;
      }
    }
    this.wake();
  }

  hover(i: number) {
    this.hovered = i;
    this.wake();
  }

  wake() {
    this.still = 0;
    if (!this.raf && this.w) {
      this.last = performance.now();
      this.raf = requestAnimationFrame(this.frame);
    }
  }

  stop() {
    cancelAnimationFrame(this.raf);
    this.raf = 0;
  }

  private frame = (now: number) => {
    this.acc += Math.min((now - this.last) / 1000, 0.05);
    this.last = now;
    while (this.acc >= STEP) {
      this.step(STEP);
      this.acc -= STEP;
    }
    // Sleep once everything has been still for a moment.
    this.still = this.draw() < 0.05 ? this.still + 1 : 0;
    this.raf = this.still > 40 ? 0 : requestAnimationFrame(this.frame);
  };

  private step(dt: number) {
    const { bodies, w, h, r } = this;

    if (this.sorted || this.calm) {
      // Glide to the line-up, settling upright.
      const k = this.calm ? 1 : 1 - Math.exp(-9 * dt);
      bodies.forEach((b, i) => {
        const t = this.slot(i);
        b.x += (t.x - b.x) * k;
        b.y += (t.y - b.y) * k;
        b.px = b.x;
        b.py = b.y;
        b.angle -= b.angle * k;
      });
    } else {
      const gravity = h * 6 * dt * dt;
      for (const b of bodies) {
        const vx = (b.x - b.px) * 0.997;
        const vy = (b.y - b.py) * 0.997;
        b.px = b.x;
        b.py = b.y;
        b.x += vx;
        b.y += vy + gravity;
      }
      for (let pass = 0; pass < 3; pass++) {
        // Push overlapping capsules apart…
        for (let i = 0; i < bodies.length; i++) {
          for (let j = i + 1; j < bodies.length; j++) {
            const a = bodies[i];
            const c = bodies[j];
            const dx = c.x - a.x;
            const dy = c.y - a.y;
            const d = Math.hypot(dx, dy) || 0.001;
            if (d < 2 * r) {
              const push = (2 * r - d) / 2 / d;
              a.x -= dx * push;
              a.y -= dy * push;
              c.x += dx * push;
              c.y += dy * push;
            }
          }
        }
        // …and keep them inside the tank (open at the top, so they can
        // drop in), with a little friction on the floor.
        for (const b of bodies) {
          b.x = Math.min(Math.max(b.x, r), w - r);
          if (b.y > h - r) {
            b.y = h - r;
            b.px += (b.x - b.px) * 0.1;
          }
        }
      }
      // Roll as they move sideways.
      for (const b of bodies) b.angle += (b.x - b.px) / r;
    }

    // The claw follows the pointer, or comes down over the hovered capsule.
    const target = this.hovered >= 0 && (this.sorted || this.calm) ? bodies[this.hovered] : null;
    const k = this.calm ? 1 : 1 - Math.exp(-8 * dt);
    const x = target ? target.x : this.pointerX >= 0 ? this.pointerX : w / 2;
    this.clawX += (x - this.clawX) * k;
    const clawBottom = h * 0.07 + h * 0.08 + CLAW_HEIGHT;
    const drop = target ? Math.max(0, target.y - r - clawBottom - 2) : 0;
    this.clawDrop += (drop - this.clawDrop) * k;
  }

  /** Writes positions to the page; returns how far anything moved. */
  private draw() {
    let moved = 0;
    this.bodies.forEach((b, i) => {
      moved = Math.max(moved, Math.abs(b.x - b.lx) + Math.abs(b.y - b.ly));
      b.lx = b.x;
      b.ly = b.y;
      const el = this.parts.capsules.current[i];
      if (el) {
        el.style.transform = `translate(${b.x - this.r}px, ${b.y - this.r}px) rotate(${b.angle}rad)`;
        el.style.opacity = "1";
      }
    });
    const claw = this.parts.claw.current;
    const cable = this.parts.cable.current;
    if (claw && cable) {
      moved = Math.max(moved, Math.abs(this.clawX - this.clawDrawnX));
      this.clawDrawnX = this.clawX;
      claw.style.transform = `translateX(${this.clawX}px) translateX(-50%)`;
      cable.style.height = `${this.h * 0.08 + this.clawDrop}px`;
    }
    return moved;
  }
}

const media = (query: string) => ({
  subscribe(onChange: () => void) {
    const list = matchMedia(query);
    list.addEventListener("change", onChange);
    return () => list.removeEventListener("change", onChange);
  },
  get: () => matchMedia(query).matches,
});
const reducedMotion = media("(prefers-reduced-motion: reduce)");
const finePointer = media("(hover: hover) and (pointer: fine)");

export default function TechTank({ tools }: { tools: Tool[] }) {
  // A fresh tank each time the card comes to the front, so the capsules
  // drop in again.
  const front = useIsFrontCard();
  return <Tank key={front ? "front" : "back"} tools={tools} active={front} />;
}

function Tank({ tools, active }: { tools: Tool[]; active: boolean }) {
  const calm = useSyncExternalStore(reducedMotion.subscribe, reducedMotion.get, () => false);
  const canHover = useSyncExternalStore(finePointer.subscribe, finePointer.get, () => true);
  const [sorted, setSorted] = useState(false);
  const [hovered, setHovered] = useState(-1);

  const tank = useRef<HTMLDivElement>(null);
  const glass = useRef<HTMLDivElement>(null);
  const claw = useRef<HTMLDivElement>(null);
  const cable = useRef<HTMLSpanElement>(null);
  const capsules = useRef<(HTMLLIElement | null)[]>([]);
  const engine = useRef<TankEngine | null>(null);
  const lastPointer = useRef("mouse");

  function sort(on: boolean) {
    const e = engine.current;
    if (!e || e.sorted === on) return;
    e.sort(on);
    setSorted(on);
    if (!on) setHovered(-1);
  }

  function hover(i: number) {
    engine.current?.hover(i);
    setHovered(i);
  }

  const setup = useEffectEvent(() => {
    const el = tank.current;
    if (!el) return;
    const e = new TankEngine(tools.length, { capsules, claw, cable }, reducedMotion.get());
    engine.current = e;
    // Layout size, not getBoundingClientRect: the card may still be
    // scaling into place, and transforms don't trigger the observer.
    const measure = () => e.measure(el.offsetWidth, el.offsetHeight);
    measure();
    e.fill(active);
    const observer = new ResizeObserver(() => {
      measure();
      e.wake();
    });
    observer.observe(el);
    if (active) e.wake();
    return () => {
      observer.disconnect();
      e.stop();
    };
  });

  useEffect(() => setup(), []);

  const lined = sorted || calm;

  return (
    <div
      className="flex min-h-0 flex-1 flex-col"
      onPointerEnter={(e) => {
        if (e.pointerType === "mouse") sort(true);
      }}
      onPointerLeave={(e) => {
        if (e.pointerType !== "mouse" || !engine.current) return;
        engine.current.pointerX = -1;
        sort(false);
      }}
      onPointerMove={(e) => {
        const rect = tank.current?.getBoundingClientRect();
        if (!rect || !engine.current) return;
        const x = e.clientX - rect.left;
        engine.current.pointerX = x;
        engine.current.wake();
        glass.current?.style.setProperty("--glare", String(x / rect.width - 0.5));
      }}
      onPointerDown={(e) => {
        lastPointer.current = e.pointerType;
      }}
      onClick={(e) => {
        // Touch: tap the tank to line up or drop; tap a capsule to pick it.
        if (lastPointer.current === "mouse" || !engine.current) return;
        const capsule = (e.target as HTMLElement).closest<HTMLElement>("[data-index]");
        if (engine.current.sorted && capsule) {
          const i = Number(capsule.dataset.index);
          hover(engine.current.hovered === i ? -1 : i);
        } else {
          sort(!engine.current.sorted);
        }
      }}
    >
      <div
        ref={tank}
        className="relative min-h-0 flex-1 overflow-hidden rounded-[2.4cqi] bg-canvas"
      >
        <ul aria-label="Tech stack" className="absolute inset-0">
          {tools.map((tool, i) => {
            const dim = hovered >= 0 && hovered !== i;
            return (
              <li
                key={tool.name}
                data-index={i}
                ref={(el) => {
                  capsules.current[i] = el;
                }}
                onPointerEnter={(e) => {
                  if (e.pointerType === "mouse" && engine.current?.sorted) hover(i);
                }}
                onPointerLeave={(e) => {
                  if (e.pointerType === "mouse") hover(-1);
                }}
                className="absolute top-0 left-0 opacity-0 will-change-transform"
              >
                <span
                  className={`capsule flex size-full items-center justify-center rounded-full transition-[scale,filter,opacity] duration-200 ${
                    dim ? "opacity-40 grayscale" : ""
                  } ${hovered === i ? "scale-110" : ""}`}
                >
                  <Image
                    src={tool.logo}
                    alt={tool.name}
                    width={64}
                    height={64}
                    draggable={false}
                    className={`size-[56%] object-contain ${tool.invertInDark ? "dark:invert" : ""}`}
                  />
                </span>
              </li>
            );
          })}
        </ul>

        {/* The claw, hanging from its rail. */}
        <span aria-hidden className="absolute inset-x-[3%] top-[7%] h-px bg-muted/50" />
        <div
          ref={claw}
          aria-hidden
          className="absolute top-[7%] left-0 flex flex-col items-center text-muted"
        >
          <span className="h-[5px] w-4 -translate-y-1/2 rounded-[2px] bg-current" />
          <span ref={cable} className="-mt-[2.5px] w-px bg-current" />
          <svg
            width="24"
            height={CLAW_HEIGHT}
            viewBox="0 0 24 18"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          >
            <circle cx="12" cy="3" r="2.5" fill="currentColor" stroke="none" />
            <path d="M10.5 4.5C6 8 4.5 12 7 16.5M13.5 4.5C18 8 19.5 12 17 16.5" />
          </svg>
        </div>

        <div ref={glass} aria-hidden className="tank-glass" />
      </div>

      <p
        aria-live="polite"
        className="mt-[2.4cqi] text-center font-mono text-[3.2cqi] font-light text-muted md:mt-[1.4cqi] md:text-[1.6cqi]"
      >
        {hovered >= 0
          ? tools[hovered].name
          : lined
            ? "my stack"
            : canHover
              ? "hover to sort"
              : "tap to sort"}
      </p>
    </div>
  );
}
