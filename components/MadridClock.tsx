"use client";

import { useSyncExternalStore } from "react";

const format = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Europe/Madrid",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

function subscribe(onChange: () => void) {
  const id = setInterval(onChange, 1000);
  return () => clearInterval(id);
}

const getTime = () => format.format(new Date());
// The server can't know when the page will be viewed, so it renders a
// placeholder and the browser fills in the real time on hydration.
const getServerTime = () => "--:--";

export default function MadridClock() {
  const time = useSyncExternalStore(subscribe, getTime, getServerTime);
  return <time>{time}</time>;
}
