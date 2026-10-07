import Image from "next/image";
import CopyEmail from "@/components/CopyEmail";
import { Deck, DeckCards, DeckPager } from "@/components/Deck";
import GoGators from "@/components/GoGators";
import MadridClock from "@/components/MadridClock";
import MaskIcon from "@/components/MaskIcon";
import { getLatestCommit } from "@/lib/commit";
import { getMadridWeather } from "@/lib/weather";

const EMAIL = "aaronbeschorner@gmail.com";
const SOURCE_URL = "https://github.com/aaronbesc/my_portfolio";

const socials = [
  {
    name: "LinkedIn",
    href: "https://www.linkedin.com/in/aaron-beschorner/",
    icon: "/icons/linkedin.png",
    iconClass: "size-[1.6em] gators-icon gators-alt",
  },
  {
    name: "GitHub",
    href: "https://github.com/aaronbesc",
    icon: "/icons/github.png",
    iconClass: "size-[1.6em] gators-icon",
  },
  // TODO: add X profile URL.
  {
    name: "X",
    href: null,
    icon: "/icons/x.png",
    iconClass: "size-[1.4em] gators-icon gators-alt",
  },
];

const term =
  "underline decoration-dotted decoration-from-font [text-decoration-skip-ink:none] [text-underline-position:from-font]";
// During the Go Gators party, neighboring terms take opposite UF colors.
const termA = `${term} gators-text`;
const termB = `${term} gators-text gators-alt`;

// Sizes inside cards use cqi (percent of the card's width), so everything
// scales together with the card.
function BioCard() {
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
        <CopyEmail email={EMAIL} />
        {socials.map(({ name, href, icon, iconClass }) => {
          const glyph = <MaskIcon src={icon} className={iconClass} />;
          const color = "text-muted transition-colors hover:text-ink";
          return href ? (
            <a
              key={name}
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={name}
              className={`${color} flex focus-visible:text-ink`}
            >
              {glyph}
            </a>
          ) : (
            <span key={name} role="img" aria-label={name} className={`${color} flex`}>
              {glyph}
            </span>
          );
        })}
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
  const weather = await getMadridWeather();
  const commit = getLatestCommit();
  const cards = [
    <BioCard key="bio" />,
    <ComingSoonCard key="2" />,
    <ComingSoonCard key="3" />,
    <ComingSoonCard key="4" />,
  ];

  return (
    <div className="relative flex h-dvh min-h-[560px] flex-col items-center px-4">
      <header className="mt-3 flex shrink-0 items-center gap-2.5 rounded-full bg-pill py-1.5 pr-5 pl-1.5 lg:mt-5">
        <Image
          src="/images/avatar.png"
          alt="Aaron Beschorner"
          width={36}
          height={36}
          priority
          className="size-8 rounded-full md:size-9"
        />
        <div className="leading-tight">
          <h1 className="text-[14px] font-medium md:text-[15px]">
            Aaron Beschorner
          </h1>
          <p className="flex items-center gap-1 text-[11px] font-medium text-muted md:text-[12px]">
            <Image
              src="/icons/location.svg"
              alt=""
              width={12}
              height={15}
              className="h-[1em] w-auto"
            />
            Madrid, Spain
          </p>
        </div>
        <kbd className="relative ml-3 hidden h-[26px] w-[48px] items-center justify-center font-sans text-[11px] font-medium text-muted md:flex">
          <Image
            src="/icons/kbd-bg.svg"
            alt=""
            width={48}
            height={26}
            className="absolute inset-0"
          />
          <span className="relative">Ctrl K</span>
        </kbd>
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
              href={SOURCE_URL}
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
