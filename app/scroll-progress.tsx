"use client";

import { useEffect } from "react";

/*
  Publishes scroll position as a 0..1 custom property on <html>, so CSS can react
  to it. Deliberately not using CSS scroll-driven animations: Safari does not
  support them yet and fails silently, which on an iPhone-first product means the
  effect simply would not exist for most users.
*/
export default function ScrollProgress() {
  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (reduced.matches) return;

    let frame = 0;

    const update = () => {
      frame = 0;
      // Spread across more than one screen of scrolling so the artwork eases
      // out slowly rather than snapping away in the first flick of a thumb.
      const span = window.innerHeight * 1.8;
      const raw = Math.min(1, Math.max(0, window.scrollY / span));
      // Smoothstep: gentle at both ends, no abrupt start or stop.
      const p = raw * raw * (3 - 2 * raw);
      document.documentElement.style.setProperty("--sp", p.toFixed(4));
    };

    const onScroll = () => {
      if (frame) return;
      frame = requestAnimationFrame(update);
    };

    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });

    return () => {
      if (frame) cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  return null;
}
