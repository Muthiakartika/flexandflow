import sharp from "sharp";

/** Verify decoded image bytes, not the user-controlled MIME header alone. */
export async function isDecodableImage(file: File): Promise<boolean> {
  try {
    const bytes = Buffer.from(await file.arrayBuffer());
    const decoder = sharp(bytes, { limitInputPixels: 40_000_000, failOn: "warning" });
    const metadata = await decoder.metadata();
    const expected = { "image/png": "png", "image/jpeg": "jpeg", "image/webp": "webp" }[file.type];
    if (!expected || metadata.format !== expected) return false;
    await decoder.resize(1, 1).toBuffer();
    return true;
  } catch {
    return false;
  }
}
