/*
  Regenerates the favicon and app icons from the original ink drawing.

  Run with: node scripts/build-icons.mjs

  The source art is NOT in the repo — it lives with the rest of the inspo set
  outside the project. Point SOURCE at it if the path changes. Everything else
  here is deterministic, so the icons can always be rebuilt rather than
  hand-edited.

  Two things this script exists to get right, both of which were wrong before:

  1. The mark is a BROKEN CIRCLE. Pasted onto a square tile it reads as a black
     square in a 16px tab, and the circle never registers. The tab icons are
     therefore circular with transparent corners.

  2. iOS composites transparency in an apple-touch-icon onto BLACK. So the Apple
     icon must stay an opaque square — iOS rounds it into a squircle itself.
     Making it circular would manufacture the exact black corners we removed.
*/

import sharp from "sharp";
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const APP = join(dirname(fileURLToPath(import.meta.url)), "..", "app");

const SOURCE =
  "/Users/contodo/Desktop/Living Grid UI inspo/pird and circle_.png";

/*
  The crop is derived from the DRAWN CIRCLE, not from the ink's bounding box.

  That distinction is the whole game. The bird's tail and left wing tip reach
  well past the circle, so a bounding-box crop is dragged off-centre by them —
  the circle ends up sitting low and left inside the tile, and smaller than it
  needs to be. Fitting the circle itself puts it concentric with the teal disc.

  Measured by taking the outermost ink pixel in each of 720 angular bins, then
  least-squares fitting a circle to the bins within 7% of the median radius.
  That rejects the handful of bins where the bird spikes outward. Result, in
  the 3000x3750 sheet's coordinates:

      centre (2380.2, 700.6)   radius 454.1

  The crop is then sized so the circle occupies CIRCLE_FILL of the tile, and
  centred on that circle. Ink distribution beyond the ring falls off fast —
  99.8% of all ink sits inside 1.1x the radius — so a fill of 0.92 leaves the
  ring's outer edge just inside the disc while clipping only scattered specks
  amounting to under 0.2% of the ink.
*/
const CIRCLE = { x: 2380.2, y: 700.6, r: 454.1 };
const CIRCLE_FILL = 0.92;

const half = Math.round(CIRCLE.r / CIRCLE_FILL);
const CROP = {
  left: Math.round(CIRCLE.x) - half,
  top: Math.round(CIRCLE.y) - half,
  width: half * 2,
  height: half * 2,
};

const TEAL = "#1b8088"; // the shirt ink; rose was printed to sit on exactly this
const ROSE = [236, 197, 201];

/*
  The drawing is fine-lined, so a single treatment cannot serve every size. At
  512px the pen texture is the whole point; at 16px those same strokes fall
  below one pixel and anti-alias into a grey smudge. The small variants thicken
  their ink with a gamma below 1, which pushes partial coverage toward opaque.
  Shipping deliberately bolder small icons is ordinary favicon practice.

  Size is NOT varied here — the crop above already fixes the circle at a
  constant fraction of the tile, and changing it per size would break the
  concentric alignment that fixing was for.

  gamma — below 1 thickens thin strokes; 1 leaves the ink as drawn
*/
function treatmentFor(size) {
  if (size <= 16) return { gamma: 0.45, boost: 1.5 };
  if (size <= 32) return { gamma: 0.6, boost: 1.35 };
  if (size <= 64) return { gamma: 0.85, boost: 1.3 };
  return { gamma: 1.0, boost: 1.25 };
}

/*
  Builds the drawing as rose pixels with an alpha channel taken from ink
  density, so the pen texture survives instead of being flattened to a
  silhouette. Rendered at the final size directly from the full-resolution
  source — never upscaled from a small copy, which is what made the previous
  icons soft.
*/
async function inkMark(size, { gamma, boost }) {
  const { data, info } = await sharp(SOURCE)
    .extract(CROP)
    .resize(size, size)
    .raw()
    .toBuffer({ resolveWithObject: true });

  /*
    The drawing carries a few specks of ink scattered outside the ring. Now
    that the mark fills the whole tile they would land in the disc's
    transparent corners and float free of it, so the mark is clipped to the
    same circle as the disc. Feathered over a pixel to match the disc's own
    antialiased edge, otherwise the clip reads as a hard stair-step.

    The bird's tail is well inside this boundary — only the stray specks are
    touched.
  */
  const centre = (size - 1) / 2;
  const clipRadius = size / 2;

  const out = Buffer.alloc(size * size * 4);
  for (let p = 0; p < size * size; p++) {
    const i = p * info.channels;
    const dx = (p % size) - centre;
    const dy = Math.floor(p / size) - centre;
    const edge = clipRadius - Math.hypot(dx, dy);
    if (edge <= 0) continue; // leaves the pixel fully transparent
    const srcAlpha = info.channels === 4 ? data[i + 3] : 255;
    const lum = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    // Darker ink means more opaque. Gamma and boost keep the fine dots of the
    // broken circle from washing out once the image is scaled to tab size.
    const coverage = ((255 - lum) / 255) * (srcAlpha / 255);
    const alpha = Math.pow(coverage, gamma) * boost * 255 * Math.min(1, edge);

    out[p * 4] = ROSE[0];
    out[p * 4 + 1] = ROSE[1];
    out[p * 4 + 2] = ROSE[2];
    out[p * 4 + 3] = Math.max(0, Math.min(255, Math.round(alpha)));
  }

  return sharp(out, { raw: { width: size, height: size, channels: 4 } })
    .png()
    .toBuffer();
}

function discPlate(size) {
  const svg = `<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg"><circle cx="${size / 2}" cy="${size / 2}" r="${size / 2}" fill="${TEAL}"/></svg>`;
  return sharp(Buffer.from(svg)).png().toBuffer();
}

function squarePlate(size) {
  return sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: { r: 27, g: 128, b: 136, alpha: 1 },
    },
  })
    .png()
    .toBuffer();
}

/*
  On the disc the mark is drawn at the full tile size, so the drawn circle
  lands concentric with the disc with its edge just inside it.

  On the square it is inset instead. iOS masks an apple-touch-icon into a
  squircle, and a circular mark inscribed edge to edge would have its top,
  bottom and sides crowded right up against that rounding. The padding is the
  icon's safe area, not a change to the mark.
*/
async function compose(size, plate, scale = 1) {
  const inner = Math.round(size * scale);
  const offset = Math.round((size - inner) / 2);
  return sharp(await plate(size))
    .composite([
      { input: await inkMark(inner, treatmentFor(size)), top: offset, left: offset },
    ])
    .png()
    .toBuffer();
}

// Fraction of the square the mark occupies, leaving iOS room to round it.
const APPLE_SAFE_AREA = 0.8;

/*
  Multi-size ICO with PNG-compressed entries. Browsers pick the size that suits
  the surface — 16 for the tab strip, 32 for bookmarks, larger for the Windows
  taskbar — rather than downscaling one 64px image badly for all of them.
*/
async function buildIco(sizes) {
  const images = [];
  for (const size of sizes) images.push(await compose(size, discPlate));

  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // type: icon
  header.writeUInt16LE(sizes.length, 4);

  const directory = Buffer.alloc(16 * sizes.length);
  let offset = 6 + directory.length;

  sizes.forEach((size, n) => {
    const at = n * 16;
    directory[at] = size >= 256 ? 0 : size; // 0 encodes 256
    directory[at + 1] = size >= 256 ? 0 : size;
    directory[at + 2] = 0; // palette size
    directory[at + 3] = 0; // reserved
    directory.writeUInt16LE(1, at + 4); // colour planes
    directory.writeUInt16LE(32, at + 6); // bits per pixel
    directory.writeUInt32LE(images[n].length, at + 8);
    directory.writeUInt32LE(offset, at + 12);
    offset += images[n].length;
  });

  return Buffer.concat([header, directory, ...images]);
}

const icon = await compose(512, discPlate);
writeFileSync(join(APP, "icon.png"), icon);

const apple = await compose(180, squarePlate, APPLE_SAFE_AREA);
writeFileSync(join(APP, "apple-icon.png"), apple);

const ico = await buildIco([16, 32, 48, 64]);
writeFileSync(join(APP, "favicon.ico"), ico);

console.log(
  `icon.png ${icon.length}B  apple-icon.png ${apple.length}B  favicon.ico ${ico.length}B`,
);
