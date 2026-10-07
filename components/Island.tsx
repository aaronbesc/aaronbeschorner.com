"use client";

import {
  Bars2Icon,
  ComputerDesktopIcon,
  HomeIcon,
  MoonIcon,
  PencilSquareIcon,
  RectangleStackIcon,
  SunIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import Image from "next/image";
import {
  useEffect,
  useEffectEvent,
  useRef,
  useState,
  useSyncExternalStore,
  type ComponentType,
  type SVGProps,
} from "react";
import { PROFILE } from "@/lib/profile";
import {
  applyTheme,
  getTheme,
  setTheme,
  subscribeTheme,
  type Theme,
} from "@/lib/theme";

// Inspired by the menu on colinlienard.com (MIT, © Colin Lienard).

const DURATION = 400; // ms; matches duration-400 below.
const EASE = "ease-[cubic-bezier(0.32,0.72,0,1)]";

type Item = {
  label: string;
  icon?: ComponentType<SVGProps<SVGSVGElement>>;
  /** Where the visitor is now (page, language or theme). */
  current?: boolean;
  /** Not built yet: shown, but not selectable. */
  soon?: boolean;
  /** Theme to switch to; other items just close the menu. */
  theme?: Theme;
};
type Section = { label: string; columns?: 2 | 3; items: Item[] };

function detectMac() {
  const nav = navigator as Navigator & { userAgentData?: { platform?: string } };
  return (
    nav.userAgentData?.platform === "macOS" ||
    /Mac|iPhone|iPad|iPod/.test(navigator.platform)
  );
}
const noSubscribe = () => () => {};

/**
 * The pill at the top. Hovering it (or tapping it, or ⌘K / Ctrl K) opens a
 * menu with the pages, language and theme.
 */
export default function Island() {
  const [open, setOpen] = useState(false);
  const theme = useSyncExternalStore(subscribeTheme, getTheme, (): Theme => "system");
  // null until hydrated, since the server can't know the visitor's OS.
  const isMac = useSyncExternalStore(noSubscribe, detectMac, () => null);
  const island = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const lastPointer = useRef("");
  // Right after a keyboard toggle the pointer may be resting on the island;
  // ignore hover until the animation is done so it doesn't fight back.
  const settling = useRef(false);

  useEffect(() => applyTheme(getTheme()), []);

  function items() {
    return [
      ...(island.current?.querySelectorAll<HTMLElement>("[data-menu-item]") ?? []),
    ];
  }

  function focusItem(step: number) {
    const all = items();
    const at = all.indexOf(document.activeElement as HTMLElement);
    const next = at === -1 ? (step > 0 ? 0 : all.length - 1) : (at + step + all.length) % all.length;
    all[next]?.focus();
  }

  function close() {
    setOpen(false);
    if (island.current?.contains(document.activeElement)) trigger.current?.focus();
  }

  const onKeyDown = useEffectEvent((e: KeyboardEvent) => {
    const modifier = isMac === null ? e.metaKey || e.ctrlKey : isMac ? e.metaKey : e.ctrlKey;
    if (e.key.toLowerCase() === "k" && modifier) {
      e.preventDefault();
      settling.current = true;
      setTimeout(() => (settling.current = false), DURATION);
      if (open) {
        close();
      } else {
        setOpen(true);
        // Like a command palette: jump straight into the menu.
        requestAnimationFrame(() => focusItem(1));
      }
      return;
    }
    if (!open || e.metaKey || e.ctrlKey || e.altKey) return;

    if (e.key === "Escape") {
      e.preventDefault();
      close();
      return;
    }
    const step = { ArrowDown: 1, j: 1, ArrowUp: -1, k: -1 }[e.key];
    if (step) {
      // preventDefault also keeps the card deck from reacting to these keys.
      e.preventDefault();
      focusItem(step);
    }
  });

  const onPointerDown = useEffectEvent((e: PointerEvent) => {
    if (open && !island.current?.contains(e.target as Node)) setOpen(false);
  });

  useEffect(() => {
    const key = (e: KeyboardEvent) => onKeyDown(e);
    const pointer = (e: PointerEvent) => onPointerDown(e);
    // Capture, so the menu handles keys before the card deck does.
    window.addEventListener("keydown", key, true);
    document.addEventListener("pointerdown", pointer);
    return () => {
      window.removeEventListener("keydown", key, true);
      document.removeEventListener("pointerdown", pointer);
    };
  }, []);

  function select(item: Item) {
    if (item.theme) setTheme(item.theme);
    else close();
  }

  const sections: Section[] = [
    {
      label: "Menu",
      items: [
        { label: "Home", icon: HomeIcon, current: true },
        { label: "Projects", icon: RectangleStackIcon, soon: true },
        { label: "Writing", icon: PencilSquareIcon, soon: true },
      ],
    },
    {
      label: "Language",
      columns: 2,
      items: [
        { label: "English", current: true },
        { label: "Español", soon: true },
      ],
    },
    {
      label: "Theme",
      columns: 3,
      items: (
        [
          ["light", "Light", SunIcon],
          ["dark", "Dark", MoonIcon],
          ["system", "System", ComputerDesktopIcon],
        ] as const
      ).map(([value, label, icon]) => ({
        label,
        icon,
        current: theme === value,
        theme: value,
      })),
    },
  ];

  return (
    <div
      ref={island}
      onPointerEnter={(e) => {
        if (e.pointerType === "mouse" && !settling.current) setOpen(true);
      }}
      onPointerLeave={(e) => {
        if (e.pointerType === "mouse" && !settling.current) setOpen(false);
      }}
      className={`absolute top-0 left-1/2 -translate-x-1/2 glass rounded-[22px] transition-[width] duration-400 md:rounded-[24px] ${EASE} motion-reduce:transition-none ${
        open
          ? "w-[min(24rem,calc(100vw-2rem))]"
          : "w-full"
      }`}
    >
      {/* Keeps the menu open while the pointer drifts just outside it. */}
      {open && <div className="absolute -inset-x-6 top-0 -bottom-8 -z-10 max-md:hidden" />}

      <div className="overflow-hidden rounded-[inherit]">
        <button
          ref={trigger}
          type="button"
          aria-label="Menu"
          aria-expanded={open}
          aria-controls="island-menu"
          onPointerDown={(e) => (lastPointer.current = e.pointerType)}
          onClick={(e) => {
            // A mouse already opens it by hovering; taps and keys toggle.
            if (e.detail > 0 && lastPointer.current === "mouse") return;
            setOpen(!open);
          }}
          className="flex h-11 w-full cursor-pointer items-center gap-2.5 pr-4 pl-1.5 text-left md:h-12 md:pr-2.5"
        >
          <Image
            src="/images/avatar.png"
            alt=""
            width={36}
            height={36}
            priority
            className="size-8 shrink-0 rounded-full md:size-9"
          />
          <span className="flex flex-col leading-tight whitespace-nowrap">
            <span className="text-[14px] font-medium md:text-[15px]">
              {PROFILE.name}
            </span>
            <span className="flex items-center gap-1 text-[11px] font-medium text-muted-strong md:text-[12px]">
              <Image
                src="/icons/location.svg"
                alt=""
                width={12}
                height={15}
                className="h-[1em] w-auto"
              />
              {PROFILE.location}
            </span>
          </span>
          <kbd className="relative ml-auto hidden h-[26px] w-[48px] shrink-0 items-center justify-center font-sans text-[11px] font-medium text-muted-strong md:flex">
            <Image
              src="/icons/kbd-bg.svg"
              alt=""
              width={48}
              height={26}
              className="absolute inset-0"
            />
            <span
              className={`relative transition-opacity ${isMac === null ? "opacity-0" : ""}`}
            >
              {isMac ? "⌘K" : "Ctrl K"}
            </span>
          </kbd>
          <span aria-hidden className="ml-auto text-muted-strong md:hidden">
            {open ? (
              <XMarkIcon className="size-4" />
            ) : (
              <Bars2Icon className="size-4" />
            )}
          </span>
        </button>

        {/* Animating grid rows from 0fr to 1fr slides the menu open to its
            natural height. */}
        <div
          id="island-menu"
          inert={!open}
          className={`grid transition-[grid-template-rows] duration-400 ${EASE} motion-reduce:transition-none ${
            open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
          }`}
        >
          <div className="min-h-0">
            <nav
              aria-label="Site"
              className={`flex flex-col px-1.5 pb-1.5 transition-[opacity,filter] ${
                open
                  ? "opacity-100 delay-100 duration-300"
                  : "opacity-0 blur-[2px] duration-150"
              }`}
            >
              {sections.map((section) => (
                <div key={section.label}>
                  <hr className="-mx-1.5 border-black/[0.06]" />
                  <p className="px-2 pt-2 pb-1 text-[11px] text-muted-strong">
                    {section.label}
                  </p>
                  <div
                    className={
                      section.columns === 3
                        ? "grid grid-cols-3 gap-1 pb-1"
                        : section.columns === 2
                          ? "grid grid-cols-2 gap-1 pb-1"
                          : "flex flex-col pb-1"
                    }
                  >
                    {section.items.map((item) => (
                      <MenuItem
                        key={item.label}
                        item={item}
                        centered={!!section.columns}
                        onSelect={() => select(item)}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </nav>
          </div>
        </div>
      </div>
    </div>
  );
}

function MenuItem({
  item,
  centered,
  onSelect,
}: {
  item: Item;
  centered: boolean;
  onSelect: () => void;
}) {
  const { label, icon: Icon, current, soon } = item;
  const layout = `flex items-center gap-2 rounded-xl px-2.5 py-2 text-[13px] ${centered ? "justify-center" : ""}`;
  const content = (
    <>
      {Icon && <Icon aria-hidden className="size-4 shrink-0 text-muted" />}
      {label}
    </>
  );

  if (soon) {
    return (
      <span aria-disabled className={`${layout} cursor-default text-muted`}>
        {content}
        <span className={`font-mono text-[10px] font-light ${centered ? "" : "ml-auto"}`}>
          soon
        </span>
      </span>
    );
  }
  return (
    <button
      type="button"
      data-menu-item
      aria-current={current || undefined}
      onClick={onSelect}
      className={`${layout} cursor-pointer outline-none hover:bg-black/5 focus-visible:bg-black/5 ${
        current ? "bg-white/70" : ""
      }`}
    >
      {content}
    </button>
  );
}
