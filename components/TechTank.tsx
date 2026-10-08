"use client";

import Image from "next/image";
import {
  useEffect,
  useEffectEvent,
  useId,
  useRef,
  useState,
  useSyncExternalStore,
  type RefObject,
} from "react";
import type { Tool } from "@/lib/stack";
import { useIsCardStill, useIsFrontCard } from "./Deck";

// A claw machine filling the card: the tools are capsules in a tank behind a
// pane of Liquid Glass. They lie in a pile under gravity; hovering the card
// lines them up in two rows, and hovering one keeps it in color while the
// claw comes down over it.

const STEP = 1 / 120; // fixed physics step, in seconds
const ROWS = 2;
const RAIL = 0.15; // rail height, as a share of the tank
const CABLE = 0.07; // resting cable length, as a share of the tank
const CLAW_HEIGHT = 18; // px, the claw drawing below the cable
const LENS = 28; // px, how far the glass bends things at its very edge

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
    const span = Math.min(this.r * 2.9, (this.w * 0.86 - 2 * this.r) / (cols - 1));
    const gap = span * 0.95;
    return {
      x: this.w / 2 + (i - row * cols - (inRow - 1) / 2) * span,
      y: this.h * 0.6 - gap / 2 + row * gap,
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
    this.r = Math.max(10, Math.min(width * 0.05, height * 0.1));
    for (const c of this.parts.capsules.current) {
      if (c) c.style.width = c.style.height = `${2 * this.r}px`;
    }
    if (this.clawX < 0) this.clawX = width / 2;
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

  /** A little hop, as if the machine got bumped when the card came forward. */
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
    const clawBottom = h * (RAIL + CABLE) + CLAW_HEIGHT;
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
      cable.style.height = `${this.h * CABLE + this.clawDrop}px`;
    }
    return moved;
  }
}

/**
 * Displacement map for the glass's lensing, for a rounded rectangle of the
 * given size. Red and green push each pixel toward the center, strongest at
 * the rim and fading to nothing a short way in, so things behind the glass
 * stretch and curve only as they reach the edge, like thick glass.
 */
function lensMap(w: number, h: number, radius: number) {
  const scale = Math.min(1, 1200 / w);
  const cw = Math.max(2, Math.round(w * scale));
  const ch = Math.max(2, Math.round(h * scale));
  const canvas = document.createElement("canvas");
  canvas.width = cw;
  canvas.height = ch;
  const ctx = canvas.getContext("2d");
  if (!ctx) return "";
  const img = ctx.createImageData(cw, ch);
  const rim = Math.min(w, h) * 0.09;
  for (let j = 0; j < ch; j++) {
    for (let i = 0; i < cw; i++) {
      // Distance in from the rounded edge, and the outward direction there.
      const x = (i + 0.5) / scale - w / 2;
      const y = (j + 0.5) / scale - h / 2;
      const qx = Math.abs(x) - (w / 2 - radius);
      const qy = Math.abs(y) - (h / 2 - radius);
      let inside: number;
      let nx = 0;
      let ny = 0;
      if (qx > 0 && qy > 0) {
        const l = Math.hypot(qx, qy);
        inside = radius - l;
        nx = qx / l;
        ny = qy / l;
      } else if (qx > qy) {
        inside = radius - qx;
        nx = 1;
      } else {
        inside = radius - qy;
        ny = 1;
      }
      const s = Math.max(0, 1 - inside / rim) ** 2;
      const k = (j * cw + i) * 4;
      img.data[k] = 128 - Math.sign(x) * nx * s * 127;
      img.data[k + 1] = 128 - Math.sign(y) * ny * s * 127;
      img.data[k + 2] = 128;
      img.data[k + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  return canvas.toDataURL();
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
  const still = useIsCardStill();
  const calm = useSyncExternalStore(reducedMotion.subscribe, reducedMotion.get, () => false);
  const canHover = useSyncExternalStore(finePointer.subscribe, finePointer.get, () => true);
  const [sorted, setSorted] = useState(false);
  const [hovered, setHovered] = useState(-1);
  const lensId = `lens-${useId().replace(/[^\w-]/g, "")}`;

  const root = useRef<HTMLDivElement>(null);
  const tank = useRef<HTMLDivElement>(null);
  const glass = useRef<HTMLDivElement>(null);
  const lens = useRef<SVGFEImageElement>(null);
  const bend = useRef<SVGFEDisplacementMapElement>(null);
  const lensRaf = useRef(0);
  const claw = useRef<HTMLDivElement>(null);
  const cable = useRef<HTMLSpanElement>(null);
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
    const e = new TankEngine(tools.length, { capsules, claw, cable }, reducedMotion.get());
    engine.current = e;
    // Layout size, not getBoundingClientRect: the card may be scaled in the
    // stack, and transforms don't trigger the observer.
    const measure = () => {
      e.measure(el.offsetWidth, el.offsetHeight);
      const map = lens.current;
      const radius = root.current ? Number.parseFloat(getComputedStyle(root.current).borderTopLeftRadius) || 0 : 0;
      if (map && el.offsetWidth) {
        map.setAttribute("width", String(el.offsetWidth));
        map.setAttribute("height", String(el.offsetHeight));
        map.setAttribute("href", lensMap(el.offsetWidth, el.offsetHeight, radius));
      }
    };
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

  // The lens is cheap while the card is at rest but costly to redraw while it
  // moves or scales, so it bends only once the card has settled in front,
  // easing in like glass settling into place.
  const onStill = useEffectEvent((on: boolean) => {
    const layer = tank.current;
    const map = bend.current;
    if (!layer || !map) return;
    cancelAnimationFrame(lensRaf.current);
    if (!on) {
      layer.style.filter = "none";
      return;
    }
    layer.style.filter = `url(#${lensId})`;
    if (reducedMotion.get()) {
      map.setAttribute("scale", String(LENS));
      return;
    }
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / 350);
      map.setAttribute("scale", String(LENS * (1 - (1 - t) ** 3)));
      if (t < 1) lensRaf.current = requestAnimationFrame(tick);
    };
    map.setAttribute("scale", "0");
    lensRaf.current = requestAnimationFrame(tick);
  });

  useEffect(() => setup(), []);
  useEffect(() => onActive(active), [active]);
  useEffect(() => onStill(still), [still]);
  useEffect(() => () => cancelAnimationFrame(lensRaf.current), []);

  const lined = (sorted && active) || calm;
  const picked = active ? hovered : -1;

  return (
    <div
      ref={root}
      className="tank relative size-full overflow-hidden rounded-[20px] md:rounded-[24px]"
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
        const y = e.clientY - rect.top;
        engine.current.pointerX = x;
        engine.current.wake();
        const g = glass.current?.style;
        g?.setProperty("--glare", String(x / rect.width - 0.5));
        g?.setProperty("--gx", `${(x / rect.width) * 100}%`);
        g?.setProperty("--gy", `${(y / rect.height) * 100}%`);
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
      {/* Everything behind the glass, bent by its lens near the edges. */}
      <div ref={tank} className="absolute inset-0">
        <ul aria-label="Tech stack" className="absolute inset-0">
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

        {/* The claw, hanging from its rail. */}
        <span
          aria-hidden
          className="absolute inset-x-[4%] h-px bg-muted/50"
          style={{ top: `${RAIL * 100}%` }}
        />
        <div
          ref={claw}
          aria-hidden
          className="absolute left-0 flex flex-col items-center text-muted"
          style={{ top: `${RAIL * 100}%` }}
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
      </div>

      <div ref={glass} aria-hidden className="liquid-glass" />

      <p
        aria-live="polite"
        className="absolute top-[5%] left-[4.5%] font-mono text-[3.2cqi] font-light text-muted md:text-[1.6cqi]"
      >
        {picked >= 0
          ? tools[picked].name
          : lined
            ? "my stack"
            : canHover
              ? "hover to sort"
              : "tap to sort"}
      </p>

      <svg aria-hidden className="pointer-events-none absolute size-0">
        <filter
          id={lensId}
          x="0"
          y="0"
          width="1"
          height="1"
          primitiveUnits="userSpaceOnUse"
          colorInterpolationFilters="sRGB"
        >
          <feImage ref={lens} x="0" y="0" preserveAspectRatio="none" result="map" />
          <feDisplacementMap
            ref={bend}
            in="SourceGraphic"
            in2="map"
            scale={0}
            xChannelSelector="R"
            yChannelSelector="G"
          />
        </filter>
      </svg>
    </div>
  );
}
