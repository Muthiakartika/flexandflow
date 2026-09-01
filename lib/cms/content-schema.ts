/**
 * Validation for what the editor sends back.
 *
 * The editor is a client component posting a whole document as one object, so
 * this is the only thing standing between a browser and the content tables.
 * Not `server-only`: the editor validates with the same schema before it
 * enables the save button, so the two cannot disagree about what is valid.
 */
import { z } from "zod";

import { blocksSchema } from "@/lib/cms/blocks";

const trimmed = z.string().trim();

/**
 * Lower case, hyphens, digits. No leading, trailing or doubled hyphen.
 *
 * This becomes a URL segment, and the site's URLs are in Google's index — a
 * slug with a space or an uppercase letter in it produces a path that only
 * half the internet can link to correctly.
 */
export const slugSchema = trimmed
  .min(1, "Enter a URL")
  .max(120, "That URL is too long")
  .regex(
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
    "Use lower-case letters, numbers and single hyphens only",
  );

/**
 * A category slug.
 *
 * Shape only. Which slugs *exist* is a database question, so `saveContent` and
 * `createContent` check the value against `ContentCategory` — an enum here
 * would have to be edited and redeployed every time the studio added one,
 * which is the thing categories became rows to avoid.
 */
export const urlPrefixSchema = slugSchema;

/** `slugify("Pregnancy Massage — Bali!")` → `"pregnancy-massage-bali"`. */
export function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    /* Strip combining accents so "Café" becomes "cafe" rather than "caf". */
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);
}

const imageFields = {
  image: trimmed.nullable().default(null),
  imageWidth: z.number().int().positive().nullable().default(null),
  imageHeight: z.number().int().positive().nullable().default(null),
};

/** One rate row on a treatment page. Prices are digits; see CMS-PLAN.md §10.2. */
export const tierSchema = z.object({
  label: trimmed.min(1, "Name the tier"),
  note: trimmed.default(""),
  /* Stored as the digits-and-commas string the ported data uses, because
     `lib/pricing.ts:priceAmount` strips everything but digits and is the only
     reader. Refusing a currency prefix here keeps a third spelling from
     entering data that already mixes two. */
  price: trimmed.regex(
    /^[\d,.\s]+$/,
    "Digits only — no 'Rp' or 'IDR', the site adds that",
  ),
  duration: trimmed.optional(),
});

export const contentPayloadSchema = z.object({
  docId: z.string().min(1),

  title: trimmed.min(1, "Give the page a title").max(200),
  slug: slugSchema,
  /**
   * The category segment of the URL.
   *
   * Editable for blog posts, where it *is* the category. Ignored for
   * treatments: `lib/cms/read.ts` looks those up under `uluwatu-bali` and
   * nowhere else, so a treatment on another prefix would be a page that exists
   * in the database and 404s on the site. The action pins it.
   */
  urlPrefix: urlPrefixSchema,
  excerpt: trimmed.min(1, "Write a short description").max(500),

  ...imageFields,
  bannerImage: trimmed.nullable().default(null),

  body: blocksSchema,

  /* Separate from `title` on purpose: changing a heading must not silently
     change what appears in Google. */
  seoTitle: trimmed.min(1, "Give the page an SEO title").max(200),
  seoDescription: trimmed.min(1, "Write an SEO description").max(400),
  seoOgImage: trimmed.nullable().default(null),

  /* Treatments. */
  tiers: z.array(tierSchema).nullable().default(null),
  durationLabel: trimmed.nullable().default(null),

  /* Posts — the displayed date, kept as text because that is what the original
     printed and parsing it would invent a timezone the source never had. */
  displayDate: trimmed.nullable().default(null),
});

export type ContentPayload = z.infer<typeof contentPayloadSchema>;

export const newDocSchema = z.object({
  kind: z.enum(["SERVICE", "POST"]),
  title: trimmed.min(1, "Give the page a title").max(200),
  slug: slugSchema,
  urlPrefix: urlPrefixSchema,
});

/** Turn Zod issues into per-field messages the editor can print in place. */
export function issueMap(error: z.ZodError): Record<string, string> {
  const fields: Record<string, string> = {};
  for (const issue of error.issues) {
    const path = issue.path.join(".");
    if (!(path in fields)) fields[path] = issue.message;
  }
  return fields;
}
