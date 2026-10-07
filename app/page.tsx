import Image from "next/image";
import CopyEmail from "@/components/CopyEmail";
import MadridClock from "@/components/MadridClock";
import { getLatestCommit } from "@/lib/commit";
import { getMadridWeather } from "@/lib/weather";

const EMAIL = "aaronbeschorner@gmail.com";
const SOURCE_URL = "https://github.com/aaronbesc/my_portfolio";

const socials = [
  {
    name: "LinkedIn",
    href: "https://www.linkedin.com/in/aaron-beschorner/",
    icon: "/icons/linkedin.png",
    size: 42,
  },
  {
    name: "GitHub",
    href: "https://github.com/aaronbesc",
    icon: "/icons/github.png",
    size: 42,
  },
  // TODO: add X profile URL.
  { name: "X", href: null, icon: "/icons/x.png", size: 36 },
];

const term =
  "underline decoration-dotted decoration-from-font [text-decoration-skip-ink:none] [text-underline-position:from-font]";

export default async function Home() {
  const weather = await getMadridWeather();
  const commit = getLatestCommit();

  return (
    <div className="relative flex min-h-screen flex-col items-center px-4 lg:px-0">
      <p className="mt-6 font-mono text-[15px] font-light lg:absolute lg:top-[57px] lg:right-[39px] lg:mt-0">
        <MadridClock /> in Madrid{weather && `, ${weather}`}
      </p>

      <header className="mt-4 flex h-[90px] w-[450px] max-w-full shrink-0 items-start rounded-[50px] bg-pill pr-[40px] pl-[17px] lg:mt-[57px]">
        <Image
          src="/images/avatar.png"
          alt="Aaron Beschorner"
          width={60}
          height={60}
          priority
          className="mt-[15px] rounded-full"
        />
        <div className="mt-[14px] ml-[16px] font-medium">
          <h1 className="text-[24px] leading-[29px] whitespace-nowrap">
            Aaron Beschorner
          </h1>
          <p className="mt-[2px] -ml-[3px] flex items-center text-[20px] leading-[24px] text-muted">
            <span className="flex size-[18px] items-center justify-center">
              <Image src="/icons/location.svg" alt="" width={12} height={15} />
            </span>
            <span className="ml-[6px]">Madrid, Spain</span>
          </p>
        </div>
        <kbd className="relative mt-[23px] ml-auto hidden h-[44px] w-[82px] items-center justify-center font-sans text-[20px] font-medium text-muted sm:flex">
          <Image
            src="/icons/kbd-bg.svg"
            alt=""
            width={82}
            height={44}
            className="absolute inset-0"
          />
          <span className="relative">Ctrl K</span>
        </kbd>
      </header>

      <main className="relative mt-[42px] w-[1031px] max-w-full">
        <div
          aria-hidden
          className="absolute inset-x-[9.6%] top-[62px] -bottom-[62px] rounded-[25px] bg-accent"
        />
        <div
          aria-hidden
          className="absolute inset-x-[5%] top-[34px] -bottom-[34px] rounded-[25px] bg-ink"
        />
        <section className="relative flex flex-col justify-between gap-12 rounded-[25px] bg-white px-6 pt-10 pb-8 sm:px-12 lg:min-h-[608px] lg:px-[156px] lg:pt-[95px] lg:pb-[45px]">
          <p className="text-[22px] text-black sm:text-[28px] lg:text-[32px]">
            I’m a <span className={term}>Data Engineer</span> at Intempo. I
            graduated from the{" "}
            <span className={term}>
              University of Florida
              <Image
                src="/images/uf-gators.png"
                alt="Florida Gators logo"
                width={56}
                height={56}
                className="mx-[4px] -my-[12px] inline-block size-[1.75em] align-middle"
              />
            </span>{" "}
            with a B.S in <span className={term}>Computer Science</span> and a
            minor in <span className={term}>Electrical Engineering</span>.
          </p>

          <div className="flex flex-wrap items-end justify-center gap-[16px]">
            <CopyEmail email={EMAIL} />
            {socials.map(({ name, href, icon, size }) => {
              const img = (
                <Image src={icon} alt={name} width={size} height={size} />
              );
              return href ? (
                <a
                  key={name}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="transition-opacity hover:opacity-70"
                >
                  {img}
                </a>
              ) : (
                <span key={name}>{img}</span>
              );
            })}
          </div>
        </section>
      </main>

      <footer className="mt-[94px] mb-[43px] flex w-full flex-col items-center gap-8 lg:grid lg:grid-cols-[1fr_auto_1fr] lg:items-end lg:gap-0 lg:pr-[38px] lg:pl-[51px]">
        <div className="order-2 mb-[6px] font-mono text-[15px] font-light whitespace-nowrap text-muted lg:order-none lg:justify-self-start">
          <p>
            <span className="text-ink">$</span> git log -1 --oneline
          </p>
          <p className="flex items-end text-ink">
            <span className="max-w-[min(40ch,calc(100vw-4rem))] truncate">{commit}</span>
            <span
              aria-hidden
              className="ml-[5px] inline-block h-[20px] w-[6px] bg-ink motion-safe:animate-blink"
            />
          </p>
        </div>

        <nav
          aria-label="Pages"
          className="order-1 flex h-[90px] w-[387px] max-w-full items-center rounded-[50px] border border-muted pl-[28px] text-[24px] text-muted lg:order-none"
        >
          1 de 4
        </nav>

        <div className="order-3 mb-[7px] flex flex-wrap items-center justify-center gap-x-[47px] gap-y-4 font-mono text-[15px] font-light lg:order-none lg:justify-self-end">
          <p className="flex items-center text-muted">
            made with
            <Image
              src="/icons/figma.png"
              alt="Figma"
              width={38}
              height={28}
              className="ml-[3px]"
            />
            <Image
              src="/icons/claude.png"
              alt="Claude"
              width={31}
              height={31}
              className="ml-[1px]"
            />
            <Image
              src="/icons/nextjs.png"
              alt="Next.js"
              width={31}
              height={31}
              className="ml-[12px]"
            />
          </p>
          <a
            href={SOURCE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="group flex items-center gap-[13px]"
          >
            <span className="underline decoration-from-font [text-underline-position:from-font] group-hover:text-muted">
              see source code
            </span>
            <Image
              src="/icons/github-dark.png"
              alt=""
              width={33}
              height={33}
            />
          </a>
        </div>
      </footer>
    </div>
  );
}
