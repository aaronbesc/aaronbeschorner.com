import Image from "next/image";
import type { ReactNode } from "react";
import type { Contributions } from "@/lib/github";
import type { Dictionary } from "@/lib/i18n";
import { PROFILE } from "@/lib/profile";

// Preview cards for SocialLinks, styled after each network's profile card
// but in this site's palette, with the photos used on each network.

// Contribution levels 0–4, in shades of ink so they work in both themes.
const LEVELS = [
  "bg-ink/[0.06]",
  "bg-ink/20",
  "bg-ink/40",
  "bg-ink/65",
  "bg-ink/90",
];

function Avatar({
  src,
  size,
  className = "",
}: {
  src: string;
  size: number;
  className?: string;
}) {
  return (
    <Image
      src={src}
      alt=""
      width={size}
      height={size}
      className={`shrink-0 rounded-full object-cover ${className}`}
      style={{ width: size, height: size }}
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
      className="shrink-0 rounded-full bg-ink px-3 py-1 text-[12px] text-surface transition-colors hover:bg-ink/80"
    >
      {children}
    </a>
  );
}

/** A banner with the avatar overlapping it, like LinkedIn and X profiles. */
function ProfileCard({
  banner,
  bannerShape,
  avatar,
  title,
  lines,
  action,
}: {
  banner: string;
  /** The banner's aspect ratio on its network, e.g. aspect-[4/1]. */
  bannerShape: string;
  avatar: string;
  title: string;
  lines: ReactNode;
  action: ReactNode;
}) {
  return (
    <div>
      <div className={`relative ${bannerShape}`}>
        <Image src={banner} alt="" fill sizes="18rem" className="object-cover" />
      </div>
      <div className="px-3 pb-3">
        <Avatar src={avatar} size={52} className="relative -mt-7 ring-2 ring-surface" />
        <p className="mt-1.5 font-medium">{title}</p>
        <div className="flex items-end justify-between gap-3">
          <p className="text-[12px] leading-snug text-muted">{lines}</p>
          {action}
        </div>
      </div>
    </div>
  );
}

export function GithubPreview({
  t,
  contributions,
}: {
  t: Dictionary;
  contributions: Contributions | null;
}) {
  return (
    <div className="flex flex-col gap-3 p-3">
      <div className="flex items-center gap-2.5">
        <Avatar src="/images/github/profile.jpg" size={32} />
        <div className="leading-tight">
          <p className="font-medium">{PROFILE.github}</p>
          <p className="font-mono text-[11px] font-light text-muted">
            {contributions
              ? t.previews.contributions(contributions.total)
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

export function LinkedinPreview({ t }: { t: Dictionary }) {
  return (
    <ProfileCard
      banner="/images/linkedin/background.jpg"
      bannerShape="aspect-[4/1]"
      avatar="/images/linkedin/profile.jpg"
      title={PROFILE.name}
      lines={
        <>
          {t.headline}
          <br />
          {t.location}
        </>
      }
      action={<Action href={PROFILE.linkedin}>{t.previews.connect}</Action>}
    />
  );
}

export function XPreview({ t }: { t: Dictionary }) {
  return (
    <ProfileCard
      banner="/images/x/background.jpg"
      bannerShape="aspect-[3/1]"
      avatar="/images/x/profile.jpg"
      title={PROFILE.name}
      lines={
        <>
          @{PROFILE.x}
          <br />
          {t.headline}
        </>
      }
      action={<Action href={`https://x.com/${PROFILE.x}`}>{t.previews.follow}</Action>}
    />
  );
}
