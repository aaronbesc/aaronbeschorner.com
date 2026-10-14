"use client";

import {
  sankey,
  sankeyJustify,
  sankeyLinkHorizontal,
  type SankeyLink,
  type SankeyNode,
} from "d3-sankey";
import { useEffect, useMemo, useRef, useState } from "react";
import type { Application, StatusChange } from "@/lib/applications";
import { APPLIED, COLD, REFERRAL, pipeline, type Flow } from "@/lib/pipeline";
import { statusColor } from "@/lib/status";

// The tracker's pipeline: a Sankey diagram of how applications moved from
// "Applied" through each status (lib/pipeline.ts). Nodes and links take
// their status's color, and every node is labeled with its name and count.
// Hovering (or focusing) a node or link shows its numbers and dims the
// rest; the same flows are also available as a table. On narrow screens
// the labels move to a legend under the chart, where they have room.

type Node = { id: string };
type Laid = SankeyNode<Node, Flow>;
type Link = SankeyLink<Node, Flow>;

const HEIGHT_PER_NODE = 46;
const NODE_WIDTH = 10;
const START_NODES = new Set([APPLIED, REFERRAL, COLD]);

const colorOf = (id: string) =>
  id === COLD ? "var(--status-gray)" : START_NODES.has(id) ? "var(--status-applied)" : statusColor(id);

const plural = (n: number) => (n === 1 ? "1 application" : `${n} applications`);

const toggle = (on: boolean) =>
  `rounded-full px-3 py-1 text-[13px] transition-colors ${
    on ? "bg-ink text-canvas" : "text-muted hover:bg-pill hover:text-ink"
  }`;

export default function Pipeline({
  apps,
  history,
}: {
  apps: Application[];
  history: StatusChange[];
}) {
  const box = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const [byReferral, setByReferral] = useState(false);
  const [view, setView] = useState<"chart" | "table">("chart");
  const [hover, setHover] = useState<
    { kind: "node"; id: string } | { kind: "link"; index: number } | null
  >(null);

  const flows = useMemo(() => pipeline(apps, history, byReferral), [apps, history, byReferral]);
  const drawn = view === "chart" && flows.length > 0;

  // The chart is drawn at the box's width, so it fits any screen.
  useEffect(() => {
    const el = box.current;
    if (!drawn || !el) return;
    const observer = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    observer.observe(el);
    return () => observer.disconnect();
  }, [drawn]);

  const layout = useMemo(() => {
    if (!flows.length || !width) return null;
    const ids = [...new Set(flows.flatMap((f) => [f.source, f.target]))];
    // Room for the tallest column's labels: count nodes per depth roughly by
    // the number of nodes overall, capped so a long tail doesn't tower.
    const height = Math.min(520, Math.max(220, ids.length * HEIGHT_PER_NODE));
    // (narrow screens have no labels between nodes, so they pack tighter)
    const narrow = width < 640;
    const graph = sankey<Node, Flow>()
      .nodeId((n) => n.id)
      .nodeAlign(sankeyJustify)
      .nodeWidth(NODE_WIDTH)
      .nodePadding(narrow ? 14 : 34)
      .extent([
        [1, 8],
        [width - 1, height - 8],
      ])({
      nodes: ids.map((id) => ({ id })),
      links: flows.map((f) => ({ ...f })),
    });
    return { ...graph, height, narrow };
  }, [flows, width]);

  const total = apps.length;
  const active = (link: Link, index: number) =>
    !hover ||
    (hover.kind === "link"
      ? hover.index === index
      : (link.source as Laid).id === hover.id || (link.target as Laid).id === hover.id);

  let tip: { x: number; y: number; title: string; lines: string[] } | null = null;
  if (layout && hover?.kind === "node") {
    const node = layout.nodes.find((n) => n.id === hover.id);
    if (node) {
      const reached = node.value ?? 0;
      const out = (node.sourceLinks ?? []).reduce((s, l) => s + l.value, 0);
      const ended = (node.targetLinks ?? []).length ? reached - out : 0;
      tip = {
        x: ((node.x0 ?? 0) + (node.x1 ?? 0)) / 2,
        y: node.y0 ?? 0,
        title: node.id,
        lines: [
          `${plural(reached)} · ${Math.round((reached / total) * 100)}% of all`,
          ...(ended && out ? [`${ended} still here`] : []),
        ],
      };
    }
  } else if (layout && hover?.kind === "link") {
    const link = layout.links[hover.index];
    const source = link.source as Laid;
    const target = link.target as Laid;
    tip = {
      x: ((source.x1 ?? 0) + (target.x0 ?? 0)) / 2,
      y: link.y1 ?? 0,
      title: `${source.id} → ${target.id}`,
      lines: [
        `${plural(link.value)} · ${Math.round((link.value / (source.value || 1)) * 100)}% of ${source.id}`,
      ],
    };
  }

  return (
    <section aria-labelledby="pipeline" className="mt-6 rounded-2xl bg-surface p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 id="pipeline" className="text-[17px] font-medium">
            Pipeline
          </h2>
          <p className="mt-0.5 text-[13px] text-muted">
            Where every application went, from applying to its current status.
          </p>
        </div>
        <div className="flex flex-wrap gap-1">
          <button
            type="button"
            aria-pressed={byReferral}
            onClick={() => setByReferral((on) => !on)}
            className={toggle(byReferral)}
          >
            Split by referral
          </button>
          <div role="group" aria-label="Show as" className="ml-1 flex rounded-full bg-pill p-0.5">
            {(["chart", "table"] as const).map((v) => (
              <button
                key={v}
                type="button"
                aria-pressed={view === v}
                onClick={() => setView(v)}
                className={`rounded-full px-3 py-0.5 text-[13px] capitalize transition-colors ${
                  view === v ? "bg-surface text-ink shadow-sm" : "text-muted hover:text-ink"
                }`}
              >
                {v}
              </button>
            ))}
          </div>
        </div>
      </div>

      {!flows.length ? (
        <p className="py-10 text-center font-mono text-[14px] font-light text-muted">
          add applications to see the pipeline
        </p>
      ) : view === "table" ? (
        <FlowTable flows={flows} />
      ) : (
        <div ref={box} className="relative mt-4" onMouseLeave={() => setHover(null)}>
          {layout && (
            <svg
              width={width}
              height={layout.height}
              role="img"
              aria-label={`Pipeline of ${plural(total)}: ${flows
                .map((f) => `${f.source} to ${f.target}, ${f.value}`)
                .join("; ")}. The same flows are in the table view.`}
              className="block overflow-visible"
            >
              <g fill="none">
                {layout.links.map((link, i) => (
                  <path
                    key={i}
                    d={sankeyLinkHorizontal()(link) ?? undefined}
                    // Inline style, since SVG attributes don't take var().
                    style={{
                      stroke: colorOf((link.target as Laid).id),
                      strokeOpacity: active(link, i) ? (hover ? 0.6 : 0.35) : 0.1,
                    }}
                    // 2px less than the band, so neighbors don't run together.
                    strokeWidth={Math.max(1, (link.width ?? 0) - 2)}
                    onMouseEnter={() => setHover({ kind: "link", index: i })}
                    className="transition-[stroke-opacity] duration-150"
                  />
                ))}
              </g>
              {layout.nodes.map((node) => {
                const x0 = node.x0 ?? 0;
                const x1 = node.x1 ?? 0;
                const y0 = node.y0 ?? 0;
                const y1 = node.y1 ?? 0;
                // Labels go on the side with room: right of the node in
                // the left half, left of it in the right half.
                const right = x0 < width / 2;
                const dim = hover?.kind === "node" && hover.id !== node.id;
                const value = node.value ?? 0;
                return (
                  <g
                    key={node.id}
                    tabIndex={0}
                    role="img"
                    aria-label={`${node.id}: ${plural(value)}`}
                    onMouseEnter={() => setHover({ kind: "node", id: node.id })}
                    onFocus={() => setHover({ kind: "node", id: node.id })}
                    onBlur={() => setHover(null)}
                    className="cursor-default outline-none [&:focus-visible>rect]:stroke-ink"
                    opacity={dim ? 0.45 : 1}
                  >
                    {/* A wider, invisible hit area than the thin node. */}
                    <rect x={x0 - 8} y={y0 - 4} width={x1 - x0 + 16} height={y1 - y0 + 8} fill="transparent" />
                    <rect
                      x={x0}
                      y={y0}
                      width={x1 - x0}
                      height={Math.max(2, y1 - y0)}
                      rx={2}
                      style={{ fill: colorOf(node.id) }}
                      strokeWidth={2}
                    />
                    {!layout.narrow && (
                      <text
                        x={right ? x1 + 8 : x0 - 8}
                        y={(y0 + y1) / 2}
                        textAnchor={right ? "start" : "end"}
                        // A halo in the card's color keeps labels readable over the bands.
                        className="pointer-events-none [paint-order:stroke] [stroke-linejoin:round] [stroke-width:3px] [stroke-opacity:0.8] [stroke:var(--color-surface)]"
                      >
                        <tspan
                          x={right ? x1 + 8 : x0 - 8}
                          dy="-0.2em"
                          className="fill-ink text-[13px] font-medium"
                        >
                          {node.id}
                        </tspan>
                        <tspan x={right ? x1 + 8 : x0 - 8} dy="1.25em" className="fill-muted text-[12px]">
                          {value} · {Math.round((value / total) * 100)}%
                        </tspan>
                      </text>
                    )}
                  </g>
                );
              })}
            </svg>
          )}
          {layout?.narrow && (
            <ul className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5 text-[13px]">
              {layout.nodes.map((node) => (
                <li key={node.id} className="flex min-w-0 items-center gap-2">
                  <span
                    aria-hidden
                    className="size-2.5 shrink-0 rounded-sm"
                    style={{ background: colorOf(node.id) }}
                  />
                  <span className="truncate">{node.id}</span>
                  <span className="ml-auto text-muted tabular-nums">{node.value}</span>
                </li>
              ))}
            </ul>
          )}
          {tip && (
            <div
              role="status"
              className="pointer-events-none absolute z-10 w-max max-w-[240px] -translate-x-1/2 -translate-y-full rounded-xl bg-ink px-3 py-2 text-[12px] text-canvas shadow-lg"
              style={{
                left: Math.min(Math.max(tip.x, 120), width - 120),
                top: tip.y - 8,
              }}
            >
              <p className="font-medium">{tip.title}</p>
              {tip.lines.map((line) => (
                <p key={line} className="opacity-75">
                  {line}
                </p>
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  );
}

/** The same flows as rows: the chart's accessible twin. */
function FlowTable({ flows }: { flows: Flow[] }) {
  return (
    <table className="mt-4 w-full text-left text-[14px]">
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
          <tr key={`${f.source}→${f.target}`} className="border-b border-pill last:border-0">
            <td className="py-2 pr-3">{f.source}</td>
            <td className="py-2 pr-3">
              <span className="flex items-center gap-2">
                <span
                  aria-hidden
                  className="size-2 shrink-0 rounded-full"
                  style={{ background: colorOf(f.target) }}
                />
                {f.target}
              </span>
            </td>
            <td className="py-2 text-right tabular-nums">{f.value}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
