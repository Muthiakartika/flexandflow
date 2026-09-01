/**
 * Where uploaded images go.
 *
 * Two drivers behind one function. Which one runs is decided by whether the
 * S3 variables are set, so a checkout with no bucket configured still runs the
 * whole CMS against the local disk — nothing about the editor is blocked on
 * the studio finishing its Cloudflare setup.
 *
 * ## Why S3-compatible, and why a custom domain
 *
 * `public/` is baked into the build and read-only at runtime, so uploads need
 * object storage. The choice (CMS-PLAN.md §10.1) is Cloudflare R2 behind
 * `media.flexandflow.fit`, and the reason is specific to a CMS rather than
 * about price: **published content stores image URLs**. Once an article is
 * live and indexed, its image URLs are load-bearing, and a URL on a hosting
 * provider's own domain breaks every image in every article the day the studio
 * changes host. A custom domain in front of the bucket is owned by the studio
 * and survives that.
 *
 * The S3 API is what makes the provider a configuration line: the same driver
 * runs against R2, S3, Backblaze B2 or MinIO.
 */
import "server-only";

import { createHash } from "node:crypto";
import { mkdir, writeFile, unlink } from "node:fs/promises";
import path from "node:path";

import { PutObjectCommand, DeleteObjectCommand, S3Client } from "@aws-sdk/client-s3";

/** Uploads live under this prefix in the bucket, and under `public/` locally. */
const PREFIX = "uploads";

export type StoredObject = {
  /** The URL to store on the content and render from. */
  url: string;
  /** The key, so the object can be deleted later. */
  key: string;
};

export type StorageConfig = {
  driver: "local" | "s3";
  bucket?: string;
  publicBase?: string;
};

function readConfig(): StorageConfig {
  const bucket = process.env.MEDIA_S3_BUCKET?.trim();
  const endpoint = process.env.MEDIA_S3_ENDPOINT?.trim();
  const key = process.env.MEDIA_S3_ACCESS_KEY_ID?.trim();
  const secret = process.env.MEDIA_S3_SECRET_ACCESS_KEY?.trim();

  if (bucket && endpoint && key && secret) {
    return {
      driver: "s3",
      bucket,
      /* Falls back to the endpoint only so a half-finished setup still serves
         something; the whole point of the custom domain is that this is set. */
      publicBase: (process.env.MEDIA_PUBLIC_BASE?.trim() || endpoint).replace(
        /\/+$/,
        "",
      ),
    };
  }

  return { driver: "local" };
}

export function storageConfig(): StorageConfig {
  return readConfig();
}

function client(): S3Client {
  return new S3Client({
    /* R2 ignores the region but the SDK requires one. */
    region: process.env.MEDIA_S3_REGION?.trim() || "auto",
    endpoint: process.env.MEDIA_S3_ENDPOINT!.trim(),
    /* R2 and MinIO serve `bucket/key` paths rather than `bucket.host`. */
    forcePathStyle: process.env.MEDIA_S3_FORCE_PATH_STYLE !== "false",
    credentials: {
      accessKeyId: process.env.MEDIA_S3_ACCESS_KEY_ID!.trim(),
      secretAccessKey: process.env.MEDIA_S3_SECRET_ACCESS_KEY!.trim(),
    },
  });
}

export function checksumOf(bytes: Buffer): string {
  return createHash("sha256").update(bytes).digest("hex");
}

/**
 * The object key for a file.
 *
 * Content-addressed: the checksum is in the name, so the same bytes always
 * land on the same key and re-uploading overwrites rather than accumulating.
 * The original filename is kept after it because a bucket listing of nothing
 * but hashes is unusable when something needs finding by hand.
 */
export function keyFor(filename: string, checksum: string): string {
  const ext = path.extname(filename).toLowerCase() || ".bin";
  const stem = path
    .basename(filename, path.extname(filename))
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);

  return `${PREFIX}/${checksum.slice(0, 12)}-${stem || "image"}${ext}`;
}

export async function putObject(
  key: string,
  bytes: Buffer,
  contentType: string,
): Promise<StoredObject> {
  const config = readConfig();

  if (config.driver === "local") {
    const target = path.join(process.cwd(), "public", key);
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, bytes);
    /* Root-relative, so `next/image` serves it from `public/` with no host in
       the stored URL — which is what makes local uploads work with no config. */
    return { url: `/${key}`, key };
  }

  await client().send(
    new PutObjectCommand({
      Bucket: config.bucket,
      Key: key,
      Body: bytes,
      ContentType: contentType,
      /* A year. The key contains the content hash, so the bytes at a given URL
         can never change and there is nothing to invalidate. */
      CacheControl: "public, max-age=31536000, immutable",
    }),
  );

  return { url: `${config.publicBase}/${key}`, key };
}

export async function deleteObject(key: string): Promise<void> {
  const config = readConfig();

  if (config.driver === "local") {
    try {
      await unlink(path.join(process.cwd(), "public", key));
    } catch {
      /* Already gone. The database row is the record that matters and the
         caller has removed it; a missing file is the state we wanted. */
    }
    return;
  }

  await client().send(
    new DeleteObjectCommand({ Bucket: config.bucket, Key: key }),
  );
}

/** The key an uploaded URL was stored under, or null for a built-in file. */
export function keyFromUrl(url: string): string | null {
  const match = url.match(new RegExp(`(?:^|/)(${PREFIX}/[^?#]+)`));
  return match ? match[1] : null;
}

/** What the upload endpoint accepts. Kept narrow on purpose. */
export const ALLOWED_TYPES: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/avif": ".avif",
  "image/gif": ".gif",
  "image/svg+xml": ".svg",
};

/**
 * 8MB.
 *
 * Well above anything this site needs — the largest image in the repo is a
 * 1770px banner — and low enough that a phone photo straight off a camera roll
 * is refused with a message rather than timing out the request.
 */
export const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;
