# Living Grid

The public-facing volunteer arm of [Living Grid](https://livinggrid.net) — a
citizen-science bioacoustic platform for making **urban** ecosystems legible
through verifiable acoustic data.

That emphasis is the point. eBird, BirdWeather and Xeno-Canto orient toward
enthusiast birders in rural refuges. The data that actually moves zoning
decisions, ecosystem-services valuation and environmental legislation is urban,
and almost nobody collects it systematically.

## Running it

```bash
npm run dev
```

The site runs at http://localhost:3000. Sign-in needs a `.env.local` with
`AUTH_SECRET`, `AUTH_GOOGLE_ID` and `AUTH_GOOGLE_SECRET`; the same values are
set in the Netlify project for the deployed contexts.

## Stack

Next.js (App Router) and TypeScript, hosted on **Netlify** — not Vercel,
despite what the framework's own docs assume. Auth.js v5 with Google OAuth.
DNS is held at Cloudflare with the proxy deliberately off, since proxying in
front of Netlify risks redirect loops and complicates certificate validation.

`trustHost: true` in `auth.ts` is **required** off Vercel. Netlify terminates
TLS at its edge, and without it Auth.js will not trust the forwarded host.

Detections are stored in a DigitalOcean Postgres shared with the Mangrove
Island monitoring node, which feeds the same tables from the other direction.

## Icons

Regenerate from the original ink drawing with:

```bash
npm run icons
```

This writes `app/favicon.ico`, `app/icon.png` and `app/apple-icon.png`. Edit
`scripts/build-icons.mjs` rather than the images — they are build output. Note
that the source artwork lives outside the repo, so the script needs that path
to exist.

Two platform traps are baked into that script, both of which cost real time to
find and neither of which reproduces on a desktop browser:

**iOS composites transparency in an apple-touch-icon onto black.** The Apple
icon must stay an opaque square. Making it circular to match the tab icons
produces black corners on the home screen — the exact artefact the circular
tab icons were introduced to remove. iOS applies its own squircle rounding, so
the mark is inset to leave that rounding room.

**iOS Safari support for WebP as a CSS `mask-image` source is unreliable and
fails silently** — the element renders nothing at all, with no console error,
while desktop Chrome renders it perfectly. Use PNG for masks. The mangrove
background sidesteps masks entirely by shipping pre-tinted as an ordinary
background image, where WebP is fine.

## Verify on a real engine

Anything visual needs checking on real WebKit before it is called done. The iOS
Simulator loads the local dev server directly and needs nothing deployed.

The landing page's scroll behaviour once appeared frozen on mobile through four
wrong diagnoses — animation-frame throttling, fixed-element compositing,
custom-property propagation, a reduced-motion branch. The actual cause was a
compile error in `scroll-progress.tsx`. A module that fails to compile means the
client component never loads, so no JavaScript runs at all, and the page still
looks perfect because the layout is all CSS with working fallbacks. Only the
scripted motion was missing.

**Check the browser console first.** The error was sitting there naming the file
and the line.

## Licence

Apache 2.0 — see [LICENSE](LICENSE) and [NOTICE](NOTICE).

That covers the **software** only. Audio submitted by contributors is licensed
separately: contributors retain copyright and grant Living Grid a non-exclusive,
perpetual licence to process and distribute it for the platform's ecological
mission. The interface artwork is used under separate written permission from
the artist and is not covered by this licence.
