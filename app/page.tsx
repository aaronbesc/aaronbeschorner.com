import Image from "next/image";
import CopyEmail from "@/components/CopyEmail";
import { Deck, DeckCards, DeckPager } from "@/components/Deck";
import GoGators from "@/components/GoGators";
import Island from "@/components/Island";
import MadridClock from "@/components/MadridClock";
import {
  GithubPreview,
  LinkedinPreview,
  XPreview,
} from "@/components/Previews";
import SocialLinks, { type Social } from "@/components/SocialLinks";
import { getLatestCommit } from "@/lib/commit";
import { getContributions } from "@/lib/github";
import { PROFILE } from "@/lib/profile";
import { getMadridWeather } from "@/lib/weather";

const term =
  "underline decoration-dotted decoration-from-font [text-decoration-skip-ink:none] [text-underline-position:from-font]";
// During the Go Gators party, neighboring terms take opposite UF colors.
const termA = `${term} gators-text`;
const termB = `${term} gators-text gators-alt`;

// Sizes inside cards use cqi (percent of the card's width), so everything
// scales together with the card.
function BioCard({ socials }: { socials: Social[] }) {
  return (
    <div className="flex size-full flex-col justify-between p-[6cqi] md:px-[12cqi] md:py-[7cqi]">
      <p className="text-[5.4cqi] text-black md:text-[3cqi]">
        I’m a <span className={termA}>Data Engineer</span> at Intempo. I
        graduated from the{" "}
        <GoGators className={termB}>
          University of Florida
          <Image
            src="/images/uf-gators.png"
            alt="Florida Gators logo"
            width={56}
            height={56}
            draggable={false}
            className="mx-[0.12em] -my-[0.4em] inline-block size-[1.75em] align-middle"
          />
        </GoGators>{" "}
        with a B.S in <span className={termA}>Computer Science</span> and a
        minor in <span className={termB}>Electrical Engineering</span>.
      </p>

      <div className="flex flex-wrap items-center justify-center gap-[1em] text-[3.4cqi] md:text-[1.9cqi]">
        <CopyEmail email={PROFILE.email} />
        <SocialLinks items={socials} />
      </div>
    </div>
  );
}

// Placeholder until the content for cards 2–4 is designed.
function ComingSoonCard() {
  return (
    <div className="flex size-full items-center justify-center font-mono text-[3.6cqi] font-light text-muted md:text-[1.9cqi]">
      coming soon
    </div>
  );
}

export default async function Home() {
  const [weather, contributions] = await Promise.all([
    getMadridWeather(),
    getContributions(PROFILE.github),
  ]);
  const commit = getLatestCommit();
  const socials: Social[] = [
    {
      name: "LinkedIn",
      href: PROFILE.linkedin,
      icon: "/icons/linkedin.png",
      iconClass: "size-[1.6em] gators-icon gators-alt",
      preview: <LinkedinPreview />,
    },
    {
      name: "GitHub",
      href: `https://github.com/${PROFILE.github}`,
      icon: "/icons/github.png",
      iconClass: "size-[1.6em] gators-icon",
      preview: <GithubPreview contributions={contributions} />,
    },
    {
      name: "X",
      href: PROFILE.x && `https://x.com/${PROFILE.x}`,
      icon: "/icons/x.png",
      iconClass: "size-[1.4em] gators-icon gators-alt",
      preview: <XPreview />,
    },
  ];
  const cards = [
    <BioCard key="bio" socials={socials} />,
    <ComingSoonCard key="2" />,
    <ComingSoonCard key="3" />,
    <ComingSoonCard key="4" />,
  ];

  return (
    <div className="relative flex h-dvh min-h-[560px] flex-col items-center px-4">
      <h1 className="sr-only">{PROFILE.name}</h1>

      {/* Holds the closed island's place; the open menu overlays the page.
          No z-index here: the island's glass must see the page behind it. */}
      <header className="relative mt-3 h-11 w-[13.5rem] shrink-0 md:h-12 md:w-[17rem] lg:mt-5">
        <Island />
      </header>

      {/* On small screens this region and the footer share the leftover
          height equally, centering the weather between the island and cards. */}
      <div className="flex flex-auto items-center py-3 lg:absolute lg:top-5 lg:right-6 lg:py-0">
        <p className="font-mono text-[11px] font-light lg:text-xs">
          <MadridClock /> in Madrid{weather && `, ${weather}`}
        </p>
      </div>

      <Deck count={cards.length}>
        <main className="w-full lg:min-h-0 lg:flex-1 lg:py-6">
          <DeckCards cards={cards} label="About Aaron" />
        </main>

        <footer className="flex w-full flex-auto flex-col items-center pt-3 pb-4 lg:grid lg:flex-none lg:pt-0 lg:grid-cols-[1fr_auto_1fr] lg:items-center lg:gap-6 lg:px-2 lg:pb-5">
          <div className="order-2 mt-3 font-mono text-[11px] font-light whitespace-nowrap text-muted lg:order-none lg:mt-0 lg:justify-self-start lg:text-xs">
            <p>
              <span className="text-ink">$</span> git log -1 --oneline
            </p>
            <p className="flex items-center text-ink">
              <span className="max-w-[min(40ch,calc(100vw-4rem))] truncate">
                {commit}
              </span>
              <span
                aria-hidden
                className="ml-[0.4em] inline-block h-[1.2em] w-[0.45em] bg-ink motion-safe:animate-blink"
              />
            </p>
          </div>

          {/* Auto margins center the pager between the cards and the commit. */}
          <DeckPager className="order-1 my-auto lg:order-none lg:my-0" />

          <div className="order-3 mt-5 flex lg:mt-0 items-center gap-6 font-mono text-[11px] font-light lg:order-none lg:justify-self-end lg:text-xs">
            <p className="flex items-center gap-1.5 text-muted">
              made with
              <Image
                src="/icons/figma.png"
                alt="Figma"
                width={24}
                height={18}
              />
              <Image
                src="/icons/claude.png"
                alt="Claude"
                width={18}
                height={18}
              />
              <Image
                src="/icons/nextjs.png"
                alt="Next.js"
                width={18}
                height={18}
              />
            </p>
            <a
              href={PROFILE.source}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-center gap-2"
            >
              <span className="underline decoration-from-font [text-underline-position:from-font] group-hover:text-muted">
                see source code
              </span>
              <Image
                src="/icons/github-dark.png"
                alt=""
                width={20}
                height={20}
              />
            </a>
          </div>
        </footer>
      </Deck>
    </div>
  );
}
