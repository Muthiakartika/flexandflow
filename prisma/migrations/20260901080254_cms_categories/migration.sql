-- CreateTable
CREATE TABLE "ContentCategory" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "lead" TEXT,
    "seoTitle" TEXT NOT NULL,
    "seoDescription" TEXT,
    "locked" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContentCategory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ContentCategory_slug_key" ON "ContentCategory"("slug");

-- CreateIndex
CREATE INDEX "ContentCategory_sortOrder_idx" ON "ContentCategory"("sortOrder");

-- The two categories that were route folders until now, with the metadata
-- those folders carried.
--
-- Seeded here rather than in `prisma/seed.ts` so the rows exist the instant
-- the dynamic route starts serving them. Between the migration and a separate
-- seed step, `/uluwatu-bali/` and `/injury-guide/` would 404 — and the first
-- of those is where all nine treatment pages live.
--
-- The strings are copied verbatim from the route files they replace. Yoast
-- marks both archives `noindex, follow`, and the injury-guide one emits no
-- meta description at all on WordPress; that null is deliberate and matched.
INSERT INTO "ContentCategory"
  ("id", "slug", "label", "lead", "seoTitle", "seoDescription", "locked", "sortOrder", "updatedAt")
VALUES
  (
    'cat_uluwatu_bali',
    'uluwatu-bali',
    'Uluwatu Bali',
    'Articles about wellness, recovery, and bodywork at our studio in Uluwatu, Bali.',
    'Uluwatu Bali Archives - Flex and Flow',
    'Discover Flex n Flow at Uluwatu Bali Archives',
    -- Locked: every treatment page is served from this prefix.
    true,
    0,
    CURRENT_TIMESTAMP
  ),
  (
    'cat_injury_guide',
    'injury-guide',
    'Injury Guide',
    'Guides on preventing and recovering from common injuries, from surfing to sitting too long.',
    'Injury Guide Archives - Flex and Flow',
    NULL,
    false,
    1,
    CURRENT_TIMESTAMP
  );
