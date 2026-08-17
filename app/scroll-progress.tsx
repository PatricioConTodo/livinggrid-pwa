"use client";

import { useEffect, useState } from "react";

const SHRINK_TO = 0.67; // scale at full scroll
const FADE_TO = 0.355; // fraction of starting opacity at full scroll

type Debug = {
  found: boolean;
  events: number;
  y: number;
  span: number;
  p: number;
  applied: string;
  computed: string;
  reduced: boolean;
  scroller: string;
};

export default function ScrollProgress({ debug = false }: { debug?: boolean }) {
  const [info, setInfo] = useState<Debug | null>(null);

  useEffect(() => {
    const art = document.querySelector<HTMLElement>(".artwork-veil-inner");
    const hero = document.querySelector<HTMLElement>(".hero");
    let events = 0;

    const measure = () => {
      if (!hero) return;
      document.documentElement.style.setProperty(
        "--hero-bottom",
        `${Math.round(hero.getBoundingClientRect().bottom)}px`,
      );
    };

    const baseOpacity = art
      ? parseFloat(
          getComputedStyle(art).getPropertyValue("--artwork-opacity"),
        ) || 0.8
      : 0.8;

    /*
      Scale the DRAWING, not the box.

      The element is viewport-sized and the artwork is wider than the screen, so
      it is cropped at the viewport edges — invisible while the element fills the
      screen. Transforming the element shrank that cropped rectangle, marching
      its hard left and right edges into view. Animating background-size instead
      keeps the element full-bleed, so the crop stays off-screen where it belongs.

      The stylesheet remains the source of truth for the base size. Clearing the
      inline value lets the computed style report it, which avoids duplicating
      the breakpoint maths here.
    */
    let baseArtHeight = 0;
    const readBaseArtSize = () => {
      if (!art) return;
      art.style.backgroundSize = "";
      const match = getComputedStyle(art)
        .backgroundSize.match(/([\d.]+)px\s*$/);
      baseArtHeight = match ? parseFloat(match[1]) : 0;
    };
    readBaseArtSize();

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");

    /*
      Read scroll from the document's scrolling element rather than window.
      If anything ever makes a different element the scroller, window.scrollY
      stays pinned at zero while the page visibly moves — which looks exactly
      like a dead animation.
    */
    const scrollTop = () =>
      document.scrollingElement?.scrollTop ?? window.scrollY ?? 0;

    const apply = () => {
      if (!art) return;
      const span = Math.max(
        1,
        document.documentElement.scrollHeight - window.innerHeight,
      );
      const y = scrollTop();
      const raw = Math.min(1, Math.max(0, y / span));
      const p = raw * raw * (3 - 2 * raw);

      const scale = reduced.matches ? 1 : 1 - p * (1 - SHRINK_TO);
      if (baseArtHeight > 0) {
        art.style.backgroundSize = `auto ${(baseArtHeight * scale).toFixed(1)}px`;
      }
      art.style.opacity = `${(baseOpacity * (1 - p * (1 - FADE_TO))).toFixed(4)}`;

      if (debug) {
        setInfo({
          found: !!art,
          events,
          y: Math.round(y),
          span: Math.round(span),
          p: Number(p.toFixed(3)),
          applied: art.style.backgroundSize,
          computed: getComputedStyle(art).backgroundSize,
          reduced: reduced.matches,
          scroller:
            document.scrollingElement === document.documentElement
              ? "html"
              : (document.scrollingElement?.tagName ?? "none"),
        });
      }
    };

    const onScroll = () => {
      events += 1;
      apply();
    };

    measure();
    apply();

    const observer = new ResizeObserver(() => {
      measure();
      readBaseArtSize();
      apply();
    });
    observer.observe(document.documentElement);
    if (hero) observer.observe(hero);

    // Window-level for normal document scrolling, plus a capture-phase listener
    // on document so a scroll on ANY element still reaches us.
    window.addEventListener("scroll", onScroll, { passive: true });
    document.addEventListener("scroll", onScroll, {
      passive: true,
      capture: true,
    });
    window.addEventListener("resize", apply, { passive: true });
    window.addEventListener("orientationchange", apply, { passive: true });
    reduced.addEventListener?.("change", apply);

    const fonts = (document as Document & { fonts?: FontFaceSet }).fonts;
    fonts?.ready.then(apply);

    return () => {
      observer.disconnect();
      window.removeEventListener("scroll", onScroll);
      document.removeEventListener("scroll", onScroll, { capture: true });
      window.removeEventListener("resize", apply);
      window.removeEventListener("orientationchange", apply);
      reduced.removeEventListener?.("change", apply);
    };
  }, [debug]);

  if (!debug || !info) return null;

  return (
    <div className="fixed left-2 top-2 z-50 rounded bg-black/85 p-2 font-mono text-[10px] leading-snug text-lime-300">
      <div>found: {String(info.found)}</div>
      <div>scroller: {info.scroller}</div>
      <div>events: {info.events}</div>
      <div>
        y: {info.y} / span: {info.span}
      </div>
      <div>p: {info.p}</div>
      <div>reduced: {String(info.reduced)}</div>
      <div>inline: {info.applied}</div>
      <div>computed: {info.computed.slice(0, 34)}</div>
    </div>
  );
}
