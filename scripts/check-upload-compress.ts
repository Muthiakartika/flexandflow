/**
 * `npm run check:upload-compress` — proves `lib/cms/compress.ts` on synthetic
 * uploads built from a photo already in the repo. No database, no storage.
 *
 * Every raster format must come back as WebP, named `.webp`, at most 1920px
 * wide on its displayed (EXIF-rotated) width, without EXIF; transparency and
 * animation must survive; SVG must pass through untouched; unreadable bytes
 * must be refused; and output must be deterministic, which the upload
 * de-duplication relies on.
 */
import { readFileSync } from "node:fs";

import sharp from "sharp";

import { convertUpload, UPLOAD_MAX_WIDTH } from "../lib/cms/compress";

const kb = (n: number) => `${(n / 1024).toFixed(0)} KB`;
let failed = 0;
function check(label: string, ok: boolean, detail: string) {
  console.log(`  ${ok ? "ok  " : "FAIL"}  ${label.padEnd(30)} ${detail}`);
  if (!ok) failed++;
}

async function webpCase(label: string, input: Buffer, mime: string, name: string, expect: { width: number; height?: number; alpha?: boolean; pages?: number }) {
  const r = await convertUpload(input, mime, name);
  if (!r.ok) return check(label, false, r.message);
  const m = await sharp(r.bytes, { animated: true }).metadata();
  const ok =
    r.mimeType === "image/webp" && m.format === "webp" && r.filename.endsWith(".webp") &&
    r.width === expect.width && (expect.height === undefined || r.height === expect.height) &&
    !m.exif && (expect.alpha === undefined || m.hasAlpha === expect.alpha) &&
    (m.pages ?? 1) === (expect.pages ?? 1);
  check(label, ok, `${kb(input.length)} → ${kb(r.bytes.length)}, ${r.width}×${r.height}, ${r.filename}${m.pages ? `, ${m.pages} frames` : ""}${m.hasAlpha ? ", alpha" : ""}`);
  return r;
}

async function main() {
  const photo = readFileSync("public/images/2026/08/trauma-healing-new.jpg");

  // Portrait source at 4000×6000 with orientation 6: displays as 6000×4000,
  // so the cap must land on the displayed width — 1920×1280.
  const phone = await sharp(photo).resize({ width: 4000 }).jpeg({ quality: 95 }).withMetadata({ orientation: 6 }).toBuffer();
  const p = await webpCase("phone JPEG, EXIF-rotated", phone, "image/jpeg", "IMG_2041.JPG", { width: 1920, height: 1280 });

  await webpCase("small JPEG, not enlarged", await sharp(photo).resize({ width: 800 }).jpeg().toBuffer(), "image/jpeg", "small.jpeg", { width: 800 });
  await webpCase("3000px PNG", await sharp(photo).resize({ width: 3000 }).png().toBuffer(), "image/png", "Photo.png", { width: UPLOAD_MAX_WIDTH });

  const transparent = await sharp({ create: { width: 600, height: 300, channels: 4, background: { r: 127, g: 140, b: 58, alpha: 0 } } })
    .composite([{ input: await sharp(photo).resize(200).toBuffer(), left: 50, top: 0 }])
    .png().toBuffer();
  await webpCase("transparent PNG keeps alpha", transparent, "image/png", "logo.png", { width: 600, alpha: true });

  await webpCase("3200px WebP", await sharp(photo).resize({ width: 3200 }).webp({ quality: 95 }).toBuffer(), "image/webp", "x.webp", { width: UPLOAD_MAX_WIDTH });
  await webpCase("AVIF", await sharp(photo).resize({ width: 1000 }).avif().toBuffer(), "image/avif", "x.avif", { width: 1000 });
  await webpCase("still GIF", await sharp(photo).resize(200).gif().toBuffer(), "image/gif", "x.gif", { width: 200, height: 300 });

  const frame = (r: number) => sharp({ create: { width: 120, height: 80, channels: 3, background: { r, g: 140, b: 58 } } }).png().toBuffer();
  const anim = await sharp([await frame(0), await frame(127), await frame(255)], { join: { animated: true } }).gif({ delay: [200, 200, 200] }).toBuffer();
  await webpCase("animated GIF stays animated", anim, "image/gif", "spin.gif", { width: 120, height: 80, pages: 3 });

  const svg = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"/>');
  const s = await convertUpload(svg, "image/svg+xml", "mark.svg");
  check("SVG untouched", s.ok && s.bytes === svg && s.mimeType === "image/svg+xml" && s.filename === "mark.svg", "");

  const junk = await convertUpload(Buffer.from("not an image"), "image/jpeg", "x.jpg");
  check("unreadable bytes refused", !junk.ok, junk.ok ? "" : junk.message);

  const again = await convertUpload(phone, "image/jpeg", "IMG_2041.JPG");
  check("deterministic output", Boolean(p?.ok && again.ok && again.bytes.equals(p.bytes)), "");

  console.log(failed ? `\n${failed} failed` : "\nall passed");
  process.exit(failed ? 1 : 0);
}

main();
