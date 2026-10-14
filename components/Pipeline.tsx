"use client";

import { sankey, sankeyJustify, type SankeyLink, type SankeyNode } from "d3-sankey";
import { useEffect, useMemo, useRef, useState } from "react";
import type { Application, StatusChange } from "@/lib/applications";
import { APPLIED, COLD, REFERRAL, pipeline, type Flow } from "@/lib/pipeline";
import { statusColor } from "@/lib/status";

// The tracker's pipeline: a Sankey diagram of how applications moved from
// applying through each status (lib/pipeline.ts). It's drawn like the rest
// of the site: the flows in faint ink, like the GitHub contributions graph,
// and color only on each status's thin bar, matching its pill in the table.
// Hover or tap a flow or a status for its numbers. The same flows are also
// there as a table.

type Node = { id: string };
type Laid = SankeyNode<Node, Flow>;
type Link = SankeyLink<Node, Flow>;
type Hover = { kind: "node"; id: string } | { kind: "link"; index: number } | null;

const NODE_WIDTH = 4;
const START = new Set([APPLIED, REFERRAL, COLD]);

const colorOf = (id: string) =>
  id === COLD ? "var(--status-gray)" : START.has(id) ? "var(--color-ink)" : statusColor(id);

const count = (n: number) => (n === 1 ? "1 application" : `${n} applications`);

/** A flow's band, a curve from the right of one bar to the left of the next. */
function band(link: Link) {
  const x0 = (link.source as Laid).x1 ?? 0;
  const x1 = (link.target as Laid).x0 ?? 0;
  const mid = (x0 + x1) / 2;
  return `M${x0},${link.y0}C${mid},${link.y0} ${mid},${link.y1} ${x1},${link.y1}`;
}

function lay(flows: Flow[], width: number, height: number, labelRoom: number, padding: number) {
  const ids = [...new Set(flows.flatMap((f) => [f.source, f.target]))];
  return sankey<Node, Flow>()
    .nodeId((n) => n.id)
    .nodeAlign(sankeyJustify)
    .nodeWidth(NODE_WIDTH)
    .nodePadding(padding)
    // Labels sit to the right of every bar, so the last column needs room.
    .extent([
      [0, 4],
      [width - labelRoom, height - 4],
    ])({
    nodes: ids.map((id) => ({ id })),
    links: flows.map((f) => ({ ...f })),
  });
}

const button = "rounded-full px-3 py-1 text-[13px] transition-colors hover:bg-pill";

export default function Pipeline({
  apps,
  history,
  className = "",
}: {
  apps: Application[];
  history: StatusChange[];
  className?: string;
}) {
  const box = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const [byReferral, setByReferral] = useState(false);
  const [table, setTable] = useState(false);
  const [hover, setHover] = useState<Hover>(null);

  const flows = useMemo(() => pipeline(apps, history, byReferral), [apps, history, byReferral]);
  const drawn = !table && flows.length > 0;

  // Drawn at the box's width, so it fits any screen.
  useEffect(() => {
    const el = box.current;
    if (!drawn || !el) return;
    const observer = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    observer.observe(el);
    return () => observer.disconnect();
  }, [drawn]);

  const layout = useMemo(() => {
    if (!flows.length || !width) return null;
    const narrow = width < 640;
    const labelRoom = narrow ? 84 : 150;
    const padding = narrow ? 40 : 28;
    // A first pass finds the busiest column (nodes in a column share an x);
    // the height gives each of its statuses room for a label.
    const columns = new Map<number, number>();
    for (const node of lay(flows, width, 400, labelRoom, padding).nodes) {
      columns.set(node.x0 ?? 0, (columns.get(node.x0 ?? 0) ?? 0) + 1);
    }
    const busiest = Math.max(...columns.values());
    const height = Math.min(640, Math.max(220, busiest * (narrow ? 66 : 52)));
    const graph = lay(flows, width, height, labelRoom, padding);
    const lastX = Math.max(...columns.keys());
    const step = columns.size > 1 ? lastX / (columns.size - 1) : width;
    return { ...graph, height, narrow, step, labelRoom, lastX };
  }, [flows, width]);

  const total = apps.length;
  const touches = (link: Link, id: string) =>
    (link.source as Laid).id === id || (link.target as Laid).id === id;
  const lit = (link: Link, index: number) =>
    hover?.kind === "link" ? hover.index === index : hover ? touches(link, hover.id) : false;

  let tip: { x: number; y: number; below: boolean; title: string; detail: string } | null = null;
  if (layout && hover?.kind === "node") {
    const node = layout.nodes.find((n) => n.id === hover.id);
    if (node) {
      const reached = node.value ?? 0;
      const out = (node.sourceLinks ?? []).reduce((sum, l) => sum + l.value, 0);
      const still = reached - out;
      const y = node.y0 ?? 0;
      tip = {
        x: (node.x0 ?? 0) + NODE_WIDTH / 2,
        y: y < 70 ? (node.y1 ?? 0) + 10 : y - 10,
        below: y < 70,
        title: node.id,
        detail: START.has(node.id)
          ? count(reached)
          : `${reached} of ${count(total)}${out && still ? `, ${still} still here` : ""}`,
      };
    }
  } else if (layout && hover?.kind === "link") {
    const link = layout.links[hover.index];
    const source = link.source as Laid;
    const target = link.target as Laid;
    const top = Math.min(link.y0 ?? 0, link.y1 ?? 0) - (link.width ?? 0) / 2;
    tip = {
      x: ((source.x1 ?? 0) + (target.x0 ?? 0)) / 2,
      y: top < 70 ? Math.max(link.y0 ?? 0, link.y1 ?? 0) + (link.width ?? 0) / 2 + 10 : top - 10,
      below: top < 70,
      title: `${source.id} to ${target.id}`,
      detail: `${link.value} of ${count(source.value ?? 0)}`,
    };
  }

  return (
    <section aria-labelledby="pipeline" className={`p-4 sm:p-5 ${className}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="pipeline" className="text-[15px] font-medium">
          Pipeline
        </h2>
        {flows.length > 0 && (
          <div className="-mr-1.5 flex gap-1">
            <button
              type="button"
              aria-pressed={byReferral}
              onClick={() => setByReferral((on) => !on)}
              className={`${button} ${byReferral ? "bg-pill text-ink" : "text-muted hover:text-ink"}`}
            >
              Split by referral
            </button>
            <button
              type="button"
              onClick={() => {
                setTable((on) => !on);
                setHover(null);
              }}
              className={`${button} text-muted hover:text-ink`}
            >
              {table ? "Show chart" : "Show table"}
            </button>
          </div>
        )}
      </div>

      {!flows.length ? (
        <p className="py-10 text-center font-mono text-[14px] font-light text-muted">
          no applications yet
        </p>
      ) : table ? (
        <FlowTable flows={flows} />
      ) : (
        <div
          ref={box}
          className="relative mt-4"
          onPointerLeave={(e) => e.pointerType === "mouse" && setHover(null)}
        >
          {layout && (
            <>
              <svg
                width={width}
                height={layout.height}
                role="img"
                aria-label={`How ${count(total)} moved through each status: ${flows
                  .map((f) => `${f.value} from ${f.source} to ${f.target}`)
                  .join(", ")}.`}
                className="block"
                // A tap on empty space clears what a tap selected.
                onClick={(e) => e.target === e.currentTarget && setHover(null)}
              >
                <g fill="none">
                  {layout.links.map((link, i) => (
                    <path
                      key={i}
                      d={band(link)}
                      // Inline style, since SVG attributes don't take var().
                      style={{
                        stroke: "var(--color-ink)",
                        strokeOpacity: lit(link, i) ? 0.26 : hover ? 0.04 : 0.09,
                      }}
                      // 2px narrower than its share, so neighbors don't touch.
                      strokeWidth={Math.max(1, (link.width ?? 0) - 2)}
                      className="pointer-events-none transition-[stroke-opacity] duration-150"
                    />
                  ))}
                  {/* Hit areas: thin flows are easier to point at this way. */}
                  {layout.links.map((link, i) => (
                    <path
                      key={i}
                      d={band(link)}
                      stroke="transparent"
                      strokeWidth={Math.max(10, link.width ?? 0)}
                      onPointerEnter={() => setHover({ kind: "link", index: i })}
                      onClick={() => setHover({ kind: "link", index: i })}
                    />
                  ))}
                </g>
                {layout.nodes.map((node) => (
                  <g
                    key={node.id}
                    tabIndex={0}
                    role="img"
                    aria-label={`${node.id}: ${count(node.value ?? 0)}`}
                    onPointerEnter={() => setHover({ kind: "node", id: node.id })}
                    onClick={() => setHover({ kind: "node", id: node.id })}
                    onFocus={() => setHover({ kind: "node", id: node.id })}
                    onBlur={() => setHover(null)}
                    className="outline-none [&:focus-visible>rect:last-child]:[stroke:var(--color-ink)]"
                  >
                    <rect
                      x={(node.x0 ?? 0) - 8}
                      y={(node.y0 ?? 0) - 4}
                      width={NODE_WIDTH + 16}
                      height={(node.y1 ?? 0) - (node.y0 ?? 0) + 8}
                      fill="transparent"
                    />
                    <rect
                      x={node.x0}
                      y={node.y0}
                      width={NODE_WIDTH}
                      height={Math.max(2, (node.y1 ?? 0) - (node.y0 ?? 0))}
                      rx={2}
                      style={{ fill: colorOf(node.id) }}
                      strokeWidth={2}
                    />
                  </g>
                ))}
              </svg>

              {/* Labels are text on the page rather than in the drawing, so
                  long names wrap within their column instead of running
                  into the next one. */}
              {layout.nodes.map((node) => {
                const dim =
                  hover !== null &&
                  (hover.kind === "node"
                    ? hover.id !== node.id
                    : !touches(layout.links[hover.index], node.id));
                return (
                  <div
                    key={node.id}
                    aria-hidden
                    className={`pointer-events-none absolute -translate-y-1/2 leading-tight transition-opacity duration-150 [text-shadow:0_0_3px_var(--color-surface),0_0_6px_var(--color-surface)] ${
                      dim ? "opacity-40" : ""
                    }`}
                    style={{
                      left: (node.x1 ?? 0) + 8,
                      top: ((node.y0 ?? 0) + (node.y1 ?? 0)) / 2,
                      maxWidth: ((node.x0 ?? 0) === layout.lastX ? layout.labelRoom : layout.step) - 16,
                    }}
                  >
                    <p className={layout.narrow ? "text-[12px]" : "text-[13px]"}>{node.id}</p>
                    <p className="font-mono text-[11px] font-light text-muted">{node.value}</p>
                  </div>
                );
              })}

              {tip && (
                <div
                  className={`pointer-events-none absolute z-10 w-max max-w-[220px] -translate-x-1/2 rounded-xl bg-surface px-3 py-2 text-[13px] leading-snug shadow-[0_16px_40px_-12px_rgb(0_0_0/0.25)] ring-1 ring-ink/[0.06] ${
                    tip.below ? "" : "-translate-y-full"
                  }`}
                  style={{ left: Math.min(Math.max(tip.x, 110), width - 110), top: tip.y }}
                >
                  <p className="font-medium">{tip.title}</p>
                  <p className="font-mono text-[11px] font-light text-muted">{tip.detail}</p>
                </div>
              )}
              {/* What the tooltip says, for screen readers. */}
              <p className="sr-only" aria-live="polite">
                {tip ? `${tip.title}, ${tip.detail}` : ""}
              </p>
            </>
          )}
        </div>
      )}
    </section>
  );
}

/** The same flows as rows, for reading the exact numbers. */
function FlowTable({ flows }: { flows: Flow[] }) {
  return (
    <table className="mt-3 w-full text-left text-[14px]">
      <thead>
        <tr className="border-b border-pill text-[13px] text-muted">
          <th scope="col" className="py-2 pr-3 font-normal">
            From
          </th>
          <th scope="col" className="py-2 pr-3 font-normal">
            To
          </th>
          <th scope="col" className="py-2 text-right font-normal">
            Applications
          </th>
        </tr>
      </thead>
      <tbody>
        {flows.map((f) => (
          <tr key={`${f.source}\u0000${f.target}`} className="border-b border-pill last:border-0">
            <td className="py-2 pr-3">{f.source}</td>
            <td className="py-2 pr-3">{f.target}</td>
            <td className="py-2 text-right font-mono text-[13px] font-light tabular-nums">
              {f.value}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
