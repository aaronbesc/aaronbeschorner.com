import Image from "next/image";
import type { ReactNode } from "react";
import type { Contributions } from "@/lib/github";
import { PROFILE } from "@/lib/profile";

// Preview cards for SocialLinks, styled after each network's profile card
// but in this site's palette.

const LEVELS = [
  "bg-black/[0.06]",
  "bg-accent/30",
  "bg-accent/55",
  "bg-accent/80",
  "bg-accent",
];

function Avatar({ size, className = "" }: { size: number; className?: string }) {
  return (
    <Image
      src="/images/avatar.png"
      alt=""
      width={size}
      height={size}
      className={`shrink-0 rounded-full ${className}`}
    />
  );
}

function Action({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      tabIndex={-1}
      className="shrink-0 rounded-full bg-ink px-3 py-1 text-[12px] text-white transition-colors hover:bg-ink/80"
    >
      {children}
    </a>
  );
}

/** A banner with the avatar overlapping it, like LinkedIn and X profiles. */
function ProfileCard({
  banner,
  title,
  lines,
  action,
}: {
  banner: string;
  title: string;
  lines: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div>
      <div className={`h-12 ${banner}`} />
      <div className="px-3 pb-3">
        <Avatar size={48} className="-mt-6 ring-2 ring-white" />
        <p className="mt-1.5 font-medium">{title}</p>
        <div className="flex items-end justify-between gap-3">
          <p className="text-[12px] leading-snug text-muted">{lines}</p>
          {action}
        </div>
      </div>
    </div>
  );
}

export function GithubPreview({ contributions }: { contributions: Contributions | null }) {
  return (
    <div className="flex flex-col gap-3 p-3">
      <div className="flex items-center gap-2.5">
        <Avatar size={32} />
        <div className="leading-tight">
          <p className="font-medium">{PROFILE.github}</p>
          <p className="font-mono text-[11px] font-light text-muted">
            {contributions
              ? `${contributions.total} contributions in the last year`
              : `github.com/${PROFILE.github}`}
          </p>
        </div>
      </div>
      {contributions && (
        <div
          className="grid grid-flow-col grid-rows-7 gap-[2px]"
          style={{ gridTemplateColumns: `repeat(${contributions.weeks.length}, minmax(0, 1fr))` }}
        >
          {contributions.weeks.flatMap((week, w) =>
            week.map((level, d) => (
              <div
                key={`${w}-${d}`}
                className={`aspect-square rounded-[1.5px] ${level >= 0 ? LEVELS[level] : ""}`}
              />
            )),
          )}
        </div>
      )}
    </div>
  );
}

export function LinkedinPreview() {
  return (
    <ProfileCard
      banner="bg-ink"
      title={PROFILE.name}
      lines={
        <>
          {PROFILE.headline}
          <br />
          {PROFILE.location}
        </>
      }
      action={<Action href={PROFILE.linkedin}>Connect</Action>}
    />
  );
}

export function XPreview() {
  return (
    <ProfileCard
      banner="bg-accent"
      title={PROFILE.name}
      lines={PROFILE.x ? `@${PROFILE.x}` : "Coming soon to X"}
      action={
        PROFILE.x && <Action href={`https://x.com/${PROFILE.x}`}>Follow</Action>
      }
    />
  );
}
