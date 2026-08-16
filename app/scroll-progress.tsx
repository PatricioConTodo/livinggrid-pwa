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
    /*
      Publish where the title actually ends, in pixels, so the panel's stop line
      can be derived from it rather than guessed in viewport units. On a real
      phone svh and the visual viewport diverge as the URL bar hides, which is
      how the card ended up overlapping the title on device but not in
      simulation. Measuring removes the guess entirely.
    */
    const measure = () => {
      const hero = document.querySelector<HTMLElement>(".hero");
      if (!hero) return;
      const bottom = hero.getBoundingClientRect().bottom;
      document.documentElement.style.setProperty(
        "--hero-bottom",
        `${Math.round(bottom)}px`,
      );
    };

    measure();

    /*
      ResizeObserver rather than the resize event alone. The title can move for
      reasons that never fire a window resize — a webfont finishing, the mobile
      URL bar sliding away and changing viewport height, content reflowing.
      Observing the document element catches viewport changes; observing the
      title catches its own reflow.
    */
    const observer = new ResizeObserver(measure);
    observer.observe(document.documentElement);
    const heroEl = document.querySelector(".hero");
    if (heroEl) observer.observe(heroEl);

    window.addEventListener("resize", measure, { passive: true });
    window.addEventListener("orientationchange", measure, { passive: true });

    const fonts = (document as Document & { fonts?: FontFaceSet }).fonts;
    fonts?.ready.then(measure);

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (reduced.matches) {
      return () => {
        observer.disconnect();
        window.removeEventListener("resize", measure);
        window.removeEventListener("orientationchange", measure);
      };
    }

    const update = () => {
      /*
        Span is the page's ACTUAL scrollable distance, not a multiple of the
        viewport. Tying it to viewport height meant that once the page was
        trimmed to remove dead scroll, the range outran the page: on a phone
        progress only ever reached about 0.38, so the artwork barely moved.
      */
      const span = Math.max(
        1,
        document.documentElement.scrollHeight - window.innerHeight,
      );
      const raw = Math.min(1, Math.max(0, window.scrollY / span));
      // Smoothstep: gentle at both ends, no abrupt start or stop.
      const p = raw * raw * (3 - 2 * raw);
      document.documentElement.style.setProperty("--sp", p.toFixed(4));
    };

    /*
      Runs straight off the scroll event rather than deferring to an animation
      frame. Setting one custom property is cheap, and the rAF version could
      stall — frames are throttled or suspended in backgrounded and hidden
      views, leaving the artwork frozen at whatever value it last held.
    */
    const onScroll = update;

    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });

    return () => {
      observer.disconnect();
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      window.removeEventListener("resize", measure);
      window.removeEventListener("orientationchange", measure);
    };
  }, []);

  return null;
}
