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
import { useDictionary } from "./Locale";

// The tech stack as a glass tank filling the card: the tools are capsules
// lying in a pile under gravity. Hovering the card lines them up in rows,
// and hovering one keeps it in color while the rest go gray.

const STEP = 1 / 120; // fixed physics step, in seconds

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
  private raf = 0;
  private last = 0;
  private acc = 0;
  private still = 0;

  constructor(
    private count: number,
    private capsules: RefObject<(HTMLLIElement | null)[]>,
    /** Reduced motion: skip the physics and keep the capsules lined up. */
    private calm: boolean,
  ) {}

  /** Line-up rows: two on wide cards, four on square ones. */
  private get rows() {
    return this.w > this.h * 1.3 ? 2 : 4;
  }

  private get cols() {
    return Math.ceil(this.count / this.rows);
  }

  /** Where capsule i sits when lined up: in rows, centered. */
  private slot(i: number) {
    const { rows, cols } = this;
    const row = Math.floor(i / cols);
    const inRow = row < rows - 1 ? cols : this.count - cols * (rows - 1);
    const span = Math.min(this.r * 2.9, (this.w * 0.86 - 2 * this.r) / (cols - 1));
    const gap = span * 0.95;
    return {
      x: this.w / 2 + (i - row * cols - (inRow - 1) / 2) * span,
      y: this.h / 2 + (row - (rows - 1) / 2) * gap,
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
    // As big as the card allows, but small enough that a lined-up row
    // keeps some room between capsules.
    const fit = (width * 0.86) / (2.6 * (this.cols - 1) + 2);
    this.r = Math.max(10, Math.min(width * 0.05, height * 0.1, fit));
    for (const c of this.capsules.current) {
      if (c) c.style.width = c.style.height = `${2 * this.r}px`;
    }
  }

  /** Fills the tank: dropped in and settled out of sight, or lined up. */
  fill() {
    this.bodies = Array.from({ length: this.count }, (_, i) => {
      if (this.calm) {
        const t = this.slot(i);
        return { x: t.x, y: t.y, px: t.x, py: t.y, angle: 0, lx: 0, ly: 0 };
      }
      const x = this.r + Math.random() * (this.w - 2 * this.r);
      const y = -this.r * (1.5 + i * 1.4);
      return { x, y, px: x + (Math.random() - 0.5) * 2, py: y - 2, angle: Math.random() * 6.28, lx: 0, ly: 0 };
    });
    // Let them fall and come to rest right away, so the pile is already
    // there when the card peeks out from behind the first one.
    if (!this.calm) for (let t = 0; t < 4 / STEP; t++) this.step(STEP);
    this.draw();
  }

  /** A little hop, as if the tank got bumped when the card came forward. */
  jostle() {
    if (this.calm || this.sorted) return;
    for (const b of this.bodies) {
      b.py = b.y + this.r * (0.06 + Math.random() * 0.1);
      b.px = b.x + (Math.random() - 0.5) * this.r * 0.08;
    }
    this.wake();
  }

  sort(on: boolean) {
    if (this.sorted === on) return;
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
      return;
    }

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
      // …and keep them inside the tank (open at the top, so they can drop
      // in), with a little friction on the floor.
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

  /** Writes positions to the page; returns how far anything moved. */
  private draw() {
    let moved = 0;
    this.bodies.forEach((b, i) => {
      moved = Math.max(moved, Math.abs(b.x - b.lx) + Math.abs(b.y - b.ly));
      b.lx = b.x;
      b.ly = b.y;
      const el = this.capsules.current[i];
      if (el) {
        el.style.transform = `translate(${b.x - this.r}px, ${b.y - this.r}px) rotate(${b.angle}rad)`;
        el.style.opacity = "1";
      }
    });
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
  const active = useIsFrontCard();
  const { tank: t } = useDictionary();
  const calm = useSyncExternalStore(reducedMotion.subscribe, reducedMotion.get, () => false);
  const canHover = useSyncExternalStore(finePointer.subscribe, finePointer.get, () => true);
  const [sorted, setSorted] = useState(false);
  const [hovered, setHovered] = useState(-1);

  const tank = useRef<HTMLDivElement>(null);
  const glass = useRef<HTMLDivElement>(null);
  const capsules = useRef<(HTMLLIElement | null)[]>([]);
  const engine = useRef<TankEngine | null>(null);
  const lastPointer = useRef("mouse");

  function sort(on: boolean) {
    engine.current?.sort(on);
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
    const e = new TankEngine(tools.length, capsules, reducedMotion.get());
    engine.current = e;
    // Layout size, not getBoundingClientRect: the card may be scaled in the
    // stack, and transforms don't trigger the observer.
    const measure = () => e.measure(el.offsetWidth, el.offsetHeight);
    measure();
    e.fill();
    const observer = new ResizeObserver(() => {
      measure();
      e.wake();
    });
    observer.observe(el);
    return () => {
      observer.disconnect();
      e.stop();
    };
  });

  // When the card comes to the front the capsules hop; when it leaves, they
  // drop back into the pile.
  const onActive = useEffectEvent((front: boolean) => {
    if (front) engine.current?.jostle();
    else engine.current?.sort(false);
  });

  useEffect(() => setup(), []);
  useEffect(() => onActive(active), [active]);

  const lined = (sorted && active) || calm;
  const picked = active ? hovered : -1;

  return (
    <div
      className="tank relative size-full overflow-hidden rounded-[20px] md:rounded-[24px]"
      onPointerEnter={(e) => {
        if (e.pointerType === "mouse") sort(true);
      }}
      onPointerLeave={(e) => {
        if (e.pointerType === "mouse") sort(false);
      }}
      onPointerMove={(e) => {
        // The glass catches the light where the pointer is.
        const rect = tank.current?.getBoundingClientRect();
        const g = glass.current?.style;
        if (!rect || !g) return;
        const x = (e.clientX - rect.left) / rect.width;
        const y = (e.clientY - rect.top) / rect.height;
        g.setProperty("--glare", String(x - 0.5));
        g.setProperty("--gx", `${x * 100}%`);
        g.setProperty("--gy", `${y * 100}%`);
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
      <div ref={tank} className="absolute inset-0">
        <ul aria-label={t.label} className="absolute inset-0">
          {tools.map((tool, i) => {
            const dim = picked >= 0 && picked !== i;
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
                  } ${picked === i ? "scale-110" : ""}`}
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
      </div>

      <div ref={glass} aria-hidden className="tank-glass" />

      <p
        aria-live="polite"
        className="absolute top-[5%] left-[4.5%] font-mono text-[3.2cqi] font-light text-muted md:text-[1.6cqi]"
      >
        {picked >= 0
          ? tools[picked].name
          : lined
            ? t.sorted
            : canHover
              ? t.hover
              : t.tap}
      </p>
    </div>
  );
}
