/**
 * The image library.
 *
 * One row per file, keyed on the SHA-256 of its bytes — so uploading the same
 * picture twice returns the row that already exists instead of storing it
 * again. The brief asks for exactly that ("tidak membuat duplicate file yang
 * tidak diperlukan"), and it is also what stops a studio uploading its logo
 * from every screen ending up with nine copies of it.
 */
import "server-only";

import sharp from "sharp";

import { prisma } from "@/lib/db";
import {
  ALLOWED_TYPES,
  checksumOf,
  deleteObject,
  keyFor,
  keyFromUrl,
  MAX_UPLOAD_BYTES,
  putObject,
} from "@/lib/cms/storage";

export type Asset = {
  id: string;
  url: string;
  filename: string;
  mimeType: string;
  bytes: number;
  width: number | null;
  height: number | null;
  alt: string;
  builtIn: boolean;
  createdAt: Date;
};

const SELECT = {
  id: true,
  url: true,
  filename: true,
  mimeType: true,
  bytes: true,
  width: true,
  height: true,
  alt: true,
  builtIn: true,
  createdAt: true,
} as const;

export async function listAssets(search?: string): Promise<Asset[]> {
  const assets = await prisma.mediaAsset.findMany({
    select: SELECT,
    /* Newest first: the picture somebody just uploaded is the one they are
       looking for. The files that shipped with the repo sort to the bottom. */
    orderBy: [{ builtIn: "asc" }, { createdAt: "desc" }],
  });

  if (!search?.trim()) return assets;

  const needle = search.trim().toLowerCase();
  return assets.filter(
    (asset) =>
      asset.filename.toLowerCase().includes(needle) ||
      asset.alt.toLowerCase().includes(needle) ||
      asset.url.toLowerCase().includes(needle),
  );
}

export async function getAsset(id: string): Promise<Asset | null> {
  return prisma.mediaAsset.findUnique({ where: { id }, select: SELECT });
}

export type UploadResult =
  | { ok: true; asset: Asset; reused: boolean }
  | { ok: false; message: string };

/**
 * Stores a file, or hands back the one already holding those bytes.
 *
 * Dimensions are read here rather than trusted from the browser because
 * `next/image` needs them and the blog listing packs its masonry from them —
 * an image inserted without them renders at zero height and then jumps.
 */
export async function storeUpload(
  file: File,
  uploadedById: string,
  alt = "",
): Promise<UploadResult> {
  if (!(file.type in ALLOWED_TYPES)) {
    return {
      ok: false,
      message: `${file.type || "That file type"} is not an image this site can use. Use JPG, PNG, WebP, AVIF, GIF or SVG.`,
    };
  }

  if (file.size > MAX_UPLOAD_BYTES) {
    return {
      ok: false,
      message: `That file is ${(file.size / 1024 / 1024).toFixed(1)}MB. The limit is ${MAX_UPLOAD_BYTES / 1024 / 1024}MB — resize it first.`,
    };
  }

  const bytes = Buffer.from(await file.arrayBuffer());
  const checksum = checksumOf(bytes);

  const existing = await prisma.mediaAsset.findUnique({
    where: { checksum },
    select: SELECT,
  });

  /* Same bytes, same picture. Returning the existing row is what keeps the
     library free of duplicates; nothing is written and nothing is uploaded. */
  if (existing) return { ok: true, asset: existing, reused: true };

  let width: number | null = null;
  let height: number | null = null;

  if (file.type !== "image/svg+xml") {
    try {
      const meta = await sharp(bytes).metadata();
      width = meta.width ?? null;
      height = meta.height ?? null;
    } catch {
      /* An image whose header sharp cannot read still uploads. It will need
         its dimensions typed in, which the block editor asks for. */
    }
  }

  const key = keyFor(file.name || "image", checksum);
  const stored = await putObject(key, bytes, file.type);

  const asset = await prisma.mediaAsset.create({
    data: {
      url: stored.url,
      checksum,
      filename: file.name || key.split("/").pop() || "image",
      mimeType: file.type,
      bytes: bytes.byteLength,
      width,
      height,
      alt,
      uploadedById,
    },
    select: SELECT,
  });

  return { ok: true, asset, reused: false };
}

export async function updateAssetAlt(id: string, alt: string): Promise<void> {
  await prisma.mediaAsset.update({ where: { id }, data: { alt } });
}

/**
 * Where an image is used, across drafts and published revisions.
 *
 * A URL match rather than a relation, because an image can appear in a body
 * block as well as in the featured-image column and there is no foreign key to
 * either. Seventeen documents make this cheap; it exists to stop somebody
 * deleting a picture that is on a live page.
 */
export async function assetUsage(url: string): Promise<string[]> {
  const revisions = await prisma.contentRevision.findMany({
    where: {
      OR: [
        { image: url },
        { bannerImage: url },
        { seoOgImage: url },
        { body: { string_contains: url } },
      ],
    },
    select: { doc: { select: { slug: true, urlPrefix: true } } },
    distinct: ["docId"],
  });

  return revisions.map((r) => `/${r.doc.urlPrefix}/${r.doc.slug}/`);
}

export type DeleteResult = { ok: boolean; message: string };

export async function deleteAsset(id: string): Promise<DeleteResult> {
  const asset = await prisma.mediaAsset.findUnique({
    where: { id },
    select: { id: true, url: true, filename: true, builtIn: true },
  });

  if (!asset) return { ok: false, message: "That image is already gone." };

  /* The files that shipped under `public/` are still in the build whether or
     not this row exists, and the ported copy references them. Removing the row
     would only take them out of the picker while leaving the pages intact —
     confusing, and not a deletion in any useful sense. */
  if (asset.builtIn) {
    return {
      ok: false,
      message:
        "This image shipped with the site and is used by the original page copy. It cannot be deleted from here.",
    };
  }

  const used = await assetUsage(asset.url);
  if (used.length > 0) {
    return {
      ok: false,
      message: `Still used by ${used.length} page${used.length === 1 ? "" : "s"}: ${used.slice(0, 4).join(", ")}${used.length > 4 ? "…" : ""}. Remove it from those first.`,
    };
  }

  const key = keyFromUrl(asset.url);
  if (key) await deleteObject(key);

  await prisma.mediaAsset.delete({ where: { id } });

  return { ok: true, message: `${asset.filename} has been deleted.` };
}
