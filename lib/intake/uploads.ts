/**
 * Where a custom IMAGE field's upload goes. A thin sibling of
 * `lib/intake/signature.ts` — same storage driver, same "never `public/`"
 * rule, different prefix and no fixed content type, since an admin-added
 * IMAGE field can be a photo of anything, not a signature specifically.
 */
import "server-only";

import { randomUUID } from "node:crypto";

import { putObject } from "@/lib/cms/storage";

const PREFIX = "intake-uploads";

const EXTENSION_FOR: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
};

export async function storeIntakeImage(
  bytes: Buffer,
  contentType: string,
): Promise<{ url: string }> {
  const ext = EXTENSION_FOR[contentType] ?? ".bin";
  const key = `${PREFIX}/${randomUUID()}${ext}`;
  const stored = await putObject(key, bytes, contentType);
  return { url: stored.url };
}
