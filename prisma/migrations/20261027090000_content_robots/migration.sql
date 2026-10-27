-- Per-page robots switches for the CMS (Yoast's "Advanced" tab).
ALTER TABLE "ContentRevision"
  ADD COLUMN "seoNoindex"  BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "seoNofollow" BOOLEAN NOT NULL DEFAULT false;

-- These two were held out of search in code (`NOINDEX_SERVICES`, 2026-10-27).
-- Carried onto every revision so the published page, the draft and any
-- restored version all keep serving `noindex, nofollow` once the code reads
-- the column instead.
UPDATE "ContentRevision" r
SET "seoNoindex" = true, "seoNofollow" = true
FROM "ContentDoc" d
WHERE r."docId" = d.id
  AND d.kind = 'SERVICE'
  AND d.slug IN ('facial-massage', 'full-body-massage');
