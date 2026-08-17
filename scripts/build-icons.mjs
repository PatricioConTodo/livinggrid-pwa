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

// Bounding box of the ink within the 3000x3750 sheet, squared up with a little
// air around it. Derived by scanning for dark opaque pixels, not by eye.
const CROP = { left: 1844, top: 201, width: 1108, height: 1108 };

const TEAL = "#1b8088"; // the shirt ink; rose was printed to sit on exactly this
const ROSE = [236, 197, 201];

/*
  The drawing is fine-lined, so a single treatment cannot serve every size. At
  512px the pen texture is the whole point; at 16px those same strokes fall
  below one pixel and anti-alias into a grey smudge. So the small variants are
  drawn slightly larger in the tile and their ink is thickened with a gamma
  below 1, which pushes partial coverage toward opaque. Shipping deliberately
  bolder small icons is ordinary favicon practice, not a fudge.

  inset — fraction of the tile the drawing occupies
  gamma — below 1 thickens thin strokes; 1 leaves the ink as drawn
*/
function treatmentFor(size) {
  if (size <= 16) return { inset: 0.96, gamma: 0.45, boost: 1.5 };
  if (size <= 32) return { inset: 0.92, gamma: 0.6, boost: 1.35 };
  if (size <= 64) return { inset: 0.86, gamma: 0.85, boost: 1.3 };
  return { inset: 0.82, gamma: 1.0, boost: 1.25 };
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

  const out = Buffer.alloc(size * size * 4);
  for (let p = 0; p < size * size; p++) {
    const i = p * info.channels;
    const srcAlpha = info.channels === 4 ? data[i + 3] : 255;
    const lum = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    // Darker ink means more opaque. Gamma and boost keep the fine dots of the
    // broken circle from washing out once the image is scaled to tab size.
    const coverage = ((255 - lum) / 255) * (srcAlpha / 255);
    const alpha = Math.round(Math.pow(coverage, gamma) * boost * 255);

    out[p * 4] = ROSE[0];
    out[p * 4 + 1] = ROSE[1];
    out[p * 4 + 2] = ROSE[2];
    out[p * 4 + 3] = Math.max(0, Math.min(255, alpha));
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

async function compose(size, plate) {
  const treatment = treatmentFor(size);
  const inner = Math.round(size * treatment.inset);
  const pad = Math.round((size - inner) / 2);
  return sharp(await plate(size))
    .composite([{ input: await inkMark(inner, treatment), top: pad, left: pad }])
    .png()
    .toBuffer();
}

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

const apple = await compose(180, squarePlate);
writeFileSync(join(APP, "apple-icon.png"), apple);

const ico = await buildIco([16, 32, 48, 64]);
writeFileSync(join(APP, "favicon.ico"), ico);

console.log(
  `icon.png ${icon.length}B  apple-icon.png ${apple.length}B  favicon.ico ${ico.length}B`,
);
