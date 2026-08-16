"use client";

import { useEffect } from "react";

/*
  Drives the landing page's scroll behaviour.

  Two deliberate choices, both learned the hard way on device:

  1. The artwork's transform and opacity are written DIRECTLY onto the element
     as inline styles, not expressed as calc() over an inherited CSS custom
     property. Custom properties set on the root have to invalidate and
     recompute styles on a descendant that lives in its own compositing layer,
     and mobile browsers do not reliably do that mid-scroll. Writing the final
     values to the element removes every step where that can go wrong.

  2. It runs straight off the scroll event rather than inside a requested
     animation frame. Frames are throttled or suspended in backgrounded and
     hidden views, which can freeze the value at whatever it last held. Two
     style writes per event is cheap enough not to need deferring.
*/

const SHRINK_TO = 0.67; // scale at full scroll
const FADE_TO = 0.355; // fraction of starting opacity at full scroll

export default function ScrollProgress() {
  useEffect(() => {
    const art = document.querySelector<HTMLElement>(".artwork-veil-inner");
    const hero = document.querySelector<HTMLElement>(".hero");

    /*
      Publish where the title actually ends so the panel's stop line can be
      derived from it rather than guessed in viewport units. On a real phone
      svh and the visual viewport diverge as the URL bar hides, which is how the
      card ended up overlapping the title on device but not in simulation.
    */
    const measure = () => {
      if (!hero) return;
      document.documentElement.style.setProperty(
        "--hero-bottom",
        `${Math.round(hero.getBoundingClientRect().bottom)}px`,
      );
    };

    const baseOpacity = art
      ? parseFloat(getComputedStyle(art).getPropertyValue("--artwork-opacity")) ||
        0.67
      : 0.67;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");

    const apply = () => {
      if (!art) return;
      const span = Math.max(
        1,
        document.documentElement.scrollHeight - window.innerHeight,
      );
      const raw = Math.min(1, Math.max(0, window.scrollY / span));
      // Smoothstep: gentle at both ends, no abrupt start or stop.
      const p = raw * raw * (3 - 2 * raw);

      /*
        Reduce Motion still gets the fade. A change in opacity is not a
        vestibular trigger the way scaling or parallax is, so switching the
        whole effect off was heavier than the setting asks for — and it left
        the artwork frozen at full size for anyone with the setting on, which
        is a great many phone users.
      */
      art.style.transform = reduced.matches
        ? "scale(1)"
        : `scale(${(1 - p * (1 - SHRINK_TO)).toFixed(4)})`;
      art.style.opacity = `${(baseOpacity * (1 - p * (1 - FADE_TO))).toFixed(4)}`;
    };

    measure();
    apply();

    /*
      ResizeObserver rather than the resize event alone: the title moves for
      reasons that never fire a window resize — a webfont finishing, the mobile
      URL bar changing viewport height, content reflowing.
    */
    const observer = new ResizeObserver(() => {
      measure();
      apply();
    });
    observer.observe(document.documentElement);
    if (hero) observer.observe(hero);

    const onResize = () => {
      measure();
      apply();
    };

    window.addEventListener("scroll", apply, { passive: true });
    window.addEventListener("resize", onResize, { passive: true });
    window.addEventListener("orientationchange", onResize, { passive: true });

    const fonts = (document as Document & { fonts?: FontFaceSet }).fonts;
    fonts?.ready.then(onResize);

    // Re-apply if the motion preference changes mid-session.
    reduced.addEventListener?.("change", apply);

    return () => {
      reduced.removeEventListener?.("change", apply);
      observer.disconnect();
      window.removeEventListener("scroll", apply);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("orientationchange", onResize);
    };
  }, []);

  return null;
}
