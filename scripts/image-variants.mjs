/**
 * Writes every photo in `public/images/` as WebP at each width in
 * `lib/image-widths.ts`, into `public/images/_v/` (git-ignored), for
 * `lib/image-loader.ts` to point `next/image` at. Runs before `next build`
 * and `next dev` (package.json), so a photo added to `public/images/` gets its
 * variants on the next build without anyone remembering a step.
 *
 * Incremental: a variant newer than its source is left alone, so a warm run
 * only stats files. A source narrower than a width is written at its own
 * width under that width's name (never upscaled), so the loader can always
 * name a file that exists.
 *
 *   node scripts/image-variants.mjs          # what the build runs
 *   node scripts/image-variants.mjs --force  # rewrite every variant
 */
import { mkdir, readdir, readFile, stat } from "node:fs/promises";
import { dirname, extname, join, relative, sep } from "node:path";
import sharp from "sharp";

const ROOT = join(process.cwd(), "public", "images");
const OUT = join(ROOT, "_v");
const FORCE = process.argv.includes("--force");

/* The widths, read from the one place they are defined. */
const widthsSource = await readFile(join(process.cwd(), "lib", "image-widths.ts"), "utf8");
const WIDTHS = JSON.parse(widthsSource.match(/IMAGE_WIDTHS = (\[[^\]]+\])/)[1]);

async function* sources(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (path !== OUT) yield* sources(path);
    } else if (/\.(jpe?g|png)$/i.test(entry.name)) {
      yield path;
    }
  }
}

const mtime = (path) => stat(path).then((s) => s.mtimeMs, () => 0);

const started = Date.now();
let written = 0;
let kept = 0;
const queue = [];
for await (const src of sources(ROOT)) queue.push(src);

async function work() {
  while (queue.length) {
    const src = queue.shift();
    const base = relative(ROOT, src).slice(0, -extname(src).length).split(sep).join("/");
    const srcTime = await mtime(src);
    const pending = [];
    for (const width of WIDTHS) {
      const out = join(OUT, `${base}.${width}.webp`);
      if (!FORCE && (await mtime(out)) > srcTime) kept++;
      else pending.push({ width, out });
    }
    if (!pending.length) continue;
    const image = sharp(src, { failOn: "none" }).rotate();
    const { width: srcWidth = 0 } = await image.metadata();
    await mkdir(dirname(pending[0].out), { recursive: true });
    await Promise.all(
      pending.map(({ width, out }) =>
        image
          .clone()
          .resize({ width: Math.min(width, srcWidth || width), withoutEnlargement: true })
          .webp({ quality: 72, effort: 4 })
          .toFile(out)
          .then(() => written++),
      ),
    );
  }
}

await Promise.all(Array.from({ length: 4 }, work));
console.log(
  `image variants: ${written} written, ${kept} up to date, ${WIDTHS.length} widths, ${((Date.now() - started) / 1000).toFixed(1)}s`,
);
