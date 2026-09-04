/**
 * Where a captured signature goes.
 *
 * Reuses the CMS media library's storage driver (`putObject` — local disk in
 * dev, S3-compatible in production) for the actual byte-writing, but not its
 * `MediaAsset` checksum-dedup semantics: a signature is one-time evidentiary
 * content, not a reusable picture, and two clients drawing the same squiggle
 * is not a duplicate worth collapsing. `public/` is never used directly — see
 * CLAUDE.md, "Uploads go to object storage, never public/".
 */
import "server-only";

import { randomUUID } from "node:crypto";

import { putObject } from "@/lib/cms/storage";

const PREFIX = "intake-signatures";

export const SIGNATURE_MIME_TYPE = "image/png";

/** Comfortably above a real signature PNG; a phone photo posted here by
 *  mistake is refused with a message rather than accepted and stored. */
export const MAX_SIGNATURE_BYTES = 512 * 1024;

export async function storeSignature(bytes: Buffer): Promise<{ url: string }> {
  const key = `${PREFIX}/${randomUUID()}.png`;
  const stored = await putObject(key, bytes, SIGNATURE_MIME_TYPE);
  return { url: stored.url };
}
