# CMS — audit and plan

The owner wants to edit treatment pages and blog posts without opening the
source code, through a visual editor, with drafts, preview and publishing, plus
admin accounts with roles. This document is the audit that came first and the
plan that follows from it. Read it before writing any CMS code.

Nothing here is built yet. Sections marked **decision** are waiting on the
owner and are called out again at the bottom.

---

## 1. Audit — what is actually here

### 1.1 The stack

Next.js 16.2.12 (App Router, `trailingSlash: true`), React 19.2.4,
Tailwind v4, TypeScript, Prisma 7 against Neon Postgres through the Neon
driver adapter. Three root layouts — `(main)`, `(academy)`, `(admin)` — each
owning its own `<html>` and its own stylesheet. `cacheComponents` is **not**
enabled, so this app is on the previous caching model: `unstable_cache`,
`revalidatePath`, `revalidateTag`. Any CMS work stays on that model; turning
Cache Components on is a separate migration and not part of this.

### 1.2 Where content lives today

Two hand-written TypeScript modules, and nothing else:

| File | Lines | Contents |
|---|---:|---|
| `lib/data/services.ts` | 1,074 | 9 `Service` objects |
| `lib/data/posts.ts` | 2,127 | 8 `Post` objects |

Nine services: `assisted-stretching`, `sport-massage`, `facial-massage`,
`cupping-therapy`, `lymphatic-drainage`, `trauma-healing`,
`lymphatic-detox-massage-for-men`, `pregnancy-massage-service`,
`full-body-massage`. Eight posts, six in `uluwatu-bali` and two in
`injury-guide`.

Seventeen documents in total. That is small enough that the import is a single
scripted pass and can be verified by reading the result.

### 1.3 The content format is already a block model

This is the single most important finding, and it decides most of the plan.

`types/index.ts` defines the body of every service and post as
`ContentBlock[]` — a discriminated union, not HTML:

```ts
type ContentBlock =
  | { type: "heading"; level: 2 | 3 | 4; text: string }
  | { type: "paragraph"; text: string }
  | { type: "list"; items: string[]; ordered?: boolean }
  | { type: "columns"; items: string[] }
  | { type: "image"; src: string; alt: string; width: number; height: number }
  | { type: "faq"; items: { question: string; answer: string }[] }
  | { type: "callout"; text: string }
```

Actual usage across both files: 310 `paragraph`, 193 `heading`, 29 `columns`,
19 `list`, 4 `callout`, 3 `faq`, and **0 `image`** — the featured image is a
separate field, and no body has ever embedded one.

`components/content/RichText.tsx` is the only renderer. Inside text,
`renderInline` understands exactly three markers: `[text](url)`, `**bold**`,
`*italic*`. A link is treated as internal only when it starts exactly
`https://flexandflow.fit`; `/appointment/` is a deliberate external exception.
Raw HTML is not parsed and would print as literal text.

The consequence: **the CMS does not need a new content format.** Store
`ContentBlock[]` as JSON, extend the union with the block types the owner
asked for, and the existing renderer keeps rendering. The editor becomes a
block editor over a union the site already speaks, and preview is not an
approximation of the page — it is the page's own component and stylesheet.

### 1.4 Routing, and a collision that matters

- `/uluwatu-bali/[slug]/` serves **both** services and `uluwatu-bali` posts.
  `lib/content.ts:resolveUluwatuSlug` checks services first, then posts.
- `/injury-guide/[slug]/` serves `injury-guide` posts only.
- A post's URL comes from its `category` field, not from a folder.
- Both routes use `generateStaticParams`, so the site is prerendered at build.
- `app/sitemap.ts` reads `seo.canonicalPath` off both collections.

A CMS that lets someone create a service and a post with the same slug would
make one of them permanently unreachable. Slug uniqueness has to be enforced
**across both collections** for the `uluwatu-bali` prefix, not per table.

### 1.5 Authentication already exists — roles do not

There is a working admin login. `AdminUser` in `prisma/schema.prisma` holds
`email`, `passwordHash` (bcrypt), `name`, `active`, `createdAt`,
`lastLoginAt`. `lib/admin/auth.ts` verifies credentials with a constant-work
dummy hash so an unknown email cannot be distinguished by timing.
`lib/admin/session.ts` signs an 8-hour HS256 JWT into an httpOnly cookie.
`proxy.ts` gates `/admin/*` and deliberately re-implements the verify half
rather than importing it.

What is missing for this brief, and only this:

- **No role column.** Every admin is equally powerful.
- **No permission model.**
- **No admin CRUD.** Accounts are created by a script, from
  `ADMIN_EMAIL` / `ADMIN_PASSWORD` in the environment.
- **No profile page.**

So Phase 3 of the brief is an *extension* of a working system, not a build. The
password hashing, the timing-safe compare, the httpOnly cookie, the proxy gate
and the "re-read the row on every page so a deactivated admin loses access
immediately" behaviour are all already correct and stay as they are.

### 1.6 The admin panel already exists, and its "Services" is not this

`app/(admin)/` has five sections: Today, Bookings, Schedule, Services,
Settings. Its **Services** page edits the *booking catalogue* — the
`ServiceVariant` rows the wizard charges — not the marketing treatment pages.
The CMS adds new sections beside it; it must not be confused with it, and the
nav needs to make the difference obvious.

The panel has its own design system worth reusing verbatim:
`components/admin/primitives.tsx` (`PageHeading`, `Panel`, `TableBox`,
`Empty`, `StatusChip`, `Stat`, `FieldError`), `admin.css` tokens, the
`ActionState` / `useActionState` form pattern in `lib/admin/action-state.ts`,
and `SubmitButton`. The CMS should add almost no new admin chrome.

Three rules `lib/admin/actions.ts` states explicitly and the CMS must follow:
every action re-checks the session itself; everything is Zod-validated because
`FormData` arrives from whatever posted it; every change writes an `AuditLog`
row.

### 1.7 Images are static files

64 files under `public/images/YYYY/MM/`, plus `public/photos/`,
`public/shapes/`, `public/video/`. Referenced by root-relative path and
rendered through `next/image` with explicit `width`/`height`.

`public/` is baked into the build and is read-only at runtime. Upload
therefore needs object storage. The deployment is Vercel — `CRON.md` says the
booking cron runs on GitHub Actions *because* Vercel's Hobby plan allows one
job a day — so Vercel Blob is the least-friction option, but this is a
**decision** (§10).

### 1.8 What breaks if the data files move

Everything importing `lib/data/services.ts` or `lib/data/posts.ts` today:

| File | Uses |
|---|---|
| `app/sitemap.ts` | `posts`, `services` |
| `lib/content.ts` | `posts`, `serviceBySlug` |
| `lib/pricing.ts` | `services` (in `lowestHourlyRate`) |
| `components/blog/BlogSidebar.tsx` | `posts` (category counts) |
| `components/content/ServiceArticle.tsx` | `services` ("other treatments") |
| `app/(main)/uluwatu-bali/[slug]/page.tsx` | both, for `generateStaticParams` |
| `app/(main)/services/page.tsx` | `pricedServiceSlugs`, `serviceBySlug` |
| `app/(main)/price-list/page.tsx` | `pricedServiceSlugs`, `serviceBySlug` |
| `app/(main)/blog/page.tsx`, `blog/page/[page]/page.tsx` | `posts` |
| `sections/home/Treatments.tsx` | `serviceBySlug` |
| `app/(main)/preview/{a,b,c,d}/page.tsx` | `serviceBySlug` |
| `scripts/check-prices.ts` | `services` |
| `prisma/seed.ts` | `services` |

All of them are server components or Node scripts — nothing that reads content
is `"use client"` (`InlineFaq` is, but it receives props). So they can all
become `async`. That is the bulk of the mechanical work and the main risk
surface, and it is why §5 keeps the returned shape identical.

### 1.9 Hazards already documented that the CMS must not undo

From `CLAUDE.md`, verbatim in effect:

1. **Prices exist in two places** — `lib/data/services.ts` tiers (marketing)
   and `ServiceVariant` (what the wizard charges). `npm run check:prices`
   fails on any disagreement, and exists because this repo has published a
   wrong price three times.
2. **Sessions are not uniform** — cupping is 30 min and Master-only, trauma
   healing is 90, most are 60. Some `price` strings carry `Rp`, some do not.
   `lib/pricing.ts` normalises all of it.
3. **Two services are deliberately off every menu** — `full-body-massage` and
   `facial-massage` are indexed URLs with no published rates, absent from the
   `/services` grid and from `primaryNav` on purpose. A CMS listing must not
   quietly "fix" that.
4. **Copy is verbatim** and carries typographic apostrophes. The
   `full-body-massage` body has a stray comma and "Let us to transform" that
   are not to be tidied.
5. **`seo` is separate from `title`.** Changing a heading does not change the
   search result.
6. **Screenshots do not work in this environment** — verification is numeric
   or comes from the owner.

---

## 2. Recommended architecture

**Content moves into the existing Neon Postgres through Prisma, keeps the
`ContentBlock[]` format, and is served through a loader that returns exactly
the `Service` and `Post` shapes the site already renders.**

Why not the alternatives:

- *Keep TypeScript files, have the CMS write them.* The filesystem is
  read-only at runtime and a deploy would be needed per edit. Dead end.
- *A hosted headless CMS (Sanity, Contentful, Payload, Strapi).* A second
  vendor, a second auth system, a second content model, and a rewrite of the
  render path — against a brief that says do not rewrite and reuse what is
  there. There is already a database, an ORM, an admin panel, an auth system
  and a block format. Adding a CMS product would mean using none of them.
- *Markdown/MDX in the repo.* Same read-only problem, plus it throws away the
  block model the design depends on (`columns` renders as two-column star
  bullets, `callout` as the olive pull-quote — neither has a Markdown
  spelling).

The shape of the decision: **the database becomes the source of truth; the
TypeScript files stay in git as the origin of the one-time import and as the
record of what the WordPress site published.**

### 2.1 The contract that keeps the frontend intact

```
lib/cms/read.ts    →  getService(slug): Promise<Service | null>
                      getPost(slug): Promise<Post | null>
                      listServices(): Promise<Service[]>
                      listPosts(): Promise<Post[]>
```

These return the **existing** `Service` and `Post` types from
`types/index.ts`, assembled from database rows. `ServiceArticle`,
`PostArticle`, `RichText`, `ServicePriceCard`, `BlogListing`, `BlogSidebar`
and the price-list page take the same props they take now and are not
modified — beyond `RichText` gaining `case` arms for the new block types,
which is additive and cannot affect existing content.

`lib/content.ts` keeps its function names (`resolveUluwatuSlug`,
`postsInCategory`, `postNeighbours`, `metadataFromSeo`) and becomes async.
Callers gain an `await`. Nothing else changes.

### 2.2 Caching and publishing

Reads are wrapped in `unstable_cache` with tags:

- `cms:services`, `cms:service:<slug>`
- `cms:posts`, `cms:post:<slug>`

Publishing calls `revalidateTag` for the document and its collection, plus
`revalidatePath` for the affected URLs and for `/sitemap.xml`.
`generateStaticParams` reads the database at build, and because
`dynamicParams` is left at its default a slug published after the build
renders on demand and is then cached — so a new post goes live without a
redeploy.

Draft content is never cached: draft mode bypasses it, which is the documented
behaviour.

---

## 3. Data model

New Prisma models. Nothing existing is altered except `AdminUser`, which gains
two columns.

```prisma
enum AdminRole {
  SUPER_ADMIN
  EDITOR
}

enum ContentStatus {
  DRAFT
  PUBLISHED
}

enum ContentKind {
  SERVICE
  POST
}

/// One editable page — a treatment or a blog post. One table for both because
/// they share a URL namespace (/uluwatu-bali/<slug>/ serves either), and slug
/// uniqueness has to be enforced across the pair or one of them becomes
/// permanently unreachable. See §1.4.
model ContentDoc {
  id   String      @id @default(cuid())
  kind ContentKind

  slug String
  /// "uluwatu-bali" | "injury-guide" for POST; always "uluwatu-bali" for
  /// SERVICE, which is the prefix its page is served under.
  urlPrefix String

  status      ContentStatus @default(DRAFT)
  publishedAt DateTime?

  /// The live version. Null until first published.
  publishedRevisionId String?  @unique
  publishedRevision   ContentRevision? @relation("Published", fields: [publishedRevisionId], references: [id])

  /// The version the editor is working on. Always present.
  draftRevisionId String? @unique
  draftRevision   ContentRevision? @relation("Draft", fields: [draftRevisionId], references: [id])

  revisions ContentRevision[] @relation("AllRevisions")

  /// Position in the services grid / blog listing. Mirrors the current
  /// hand-ordered arrays.
  sortOrder Int @default(0)

  createdById String?
  updatedById String?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@unique([urlPrefix, slug])
  @@index([kind, status, sortOrder])
}

/// An immutable snapshot of a document's content. Draft and published point at
/// two of these, which is what makes "edit without touching the live page"
/// work with no branching logic in the reader: the public site reads
/// `publishedRevision`, the editor reads `draftRevision`.
model ContentRevision {
  id     String     @id @default(cuid())
  docId  String
  doc    ContentDoc @relation("AllRevisions", fields: [docId], references: [id], onDelete: Cascade)

  title   String
  excerpt String

  /// Root-relative path or blob URL. `Post.image` is optional; a service
  /// always has one.
  image       String?
  imageWidth  Int?
  imageHeight Int?
  /// Two services carry an extra banner whose heading the theme hides.
  bannerImage String?

  /// ContentBlock[] exactly as `types/index.ts` defines it. Validated by the
  /// Zod schema in `lib/cms/blocks.ts` on every write, so a malformed block
  /// can never reach the renderer.
  body Json

  /// Yoast-ported metadata. Separate from `title` on purpose — see §1.9.5.
  seoTitle       String
  seoDescription String
  seoOgImage     String?
  canonicalPath  String

  /// Service-only. TherapistTier[]; see §10 for whether this stays editable.
  tiers Json?
  /// Service-only display label, e.g. "Duration : 1 hr".
  durationLabel String?

  /// Post-only. The displayed date string, e.g. "June 22, 2026" — kept as
  /// text because that is what the original published and what the ported
  /// copy contains.
  displayDate String?

  authorId  String?
  createdAt DateTime @default(now())

  publishedFor ContentDoc? @relation("Published")
  draftFor     ContentDoc? @relation("Draft")

  @@index([docId, createdAt])
}

/// Every uploaded or imported image, once.
model MediaAsset {
  id  String @id @default(cuid())
  /// Root-relative for the files already in `public/`, absolute for uploads.
  url String @unique

  /// SHA-256 of the bytes. Uploading the same file twice returns the existing
  /// row rather than storing it again — the brief asks for exactly this.
  checksum String @unique

  filename String
  mimeType String
  bytes    Int
  width    Int?
  height   Int?
  /// Default alt text, overridable per use.
  alt      String @default("")

  uploadedById String?
  createdAt    DateTime @default(now())

  @@index([createdAt])
}
```

`AdminUser` gains:

```prisma
  role             AdminRole @default(EDITOR)
  /// Grants beyond the role's defaults, so one editor can be given a single
  /// extra capability without inventing a role. See §4.
  extraPermissions String[]  @default([])
```

**The migration must set every existing row to `SUPER_ADMIN` explicitly.** A
bare `@default(EDITOR)` would demote the owner's own account and lock them out
of admin management on the first deploy.

### 3.1 Block types

The existing seven are kept unchanged. Added, all optional and additive:

| Block | Renders as |
|---|---|
| `quote` | attributed pull-quote; distinct from `callout`, which is the olive box |
| `gallery` | image grid |
| `imageText` | image beside text, side selectable |
| `cta` | the site's `ButtonLink`, solid or outline |
| `divider` | rule or spacer |

`callout` already covers the brief's "Quote" block; `quote` is added because
the brief lists both and they are visually different. "Benefits List" and
"Treatment Information" from the brief are `columns` and `list`, which already
exist and already have the star-bullet styling.

Every new arm goes into `RichText.tsx`'s `switch`, which has a `default:
return null` — so an unknown block from a newer schema degrades to nothing
rather than throwing.

---

## 4. Authentication and roles

The existing login, hashing, session and proxy gate stay. What is added:

### 4.1 Permissions

Capability strings, not role checks scattered through the code:

```
content.view      content.create   content.update   content.delete
content.publish   media.upload     media.delete
admin.manage      booking.manage   settings.manage
```

```ts
// lib/admin/permissions.ts
const ROLE_PERMISSIONS: Record<AdminRole, Permission[]> = {
  SUPER_ADMIN: ALL,
  EDITOR: [
    "content.view", "content.create", "content.update",
    "media.upload", "booking.manage",
  ],
}

export function can(admin: AdminIdentity, permission: Permission): boolean
```

`content.publish` is deliberately **not** an editor default — the brief says
an editor may publish "jika diberikan permission", so it is granted per user
through `extraPermissions`. Same mechanism answers "kecuali diberikan
permission secara khusus" for `admin.manage`. Adding a third role later is one
entry in `ROLE_PERMISSIONS`; no call site changes.

`currentAdmin()` is extended to return `role` and the resolved permission set.
It already re-reads the row on every request, so a revoked permission takes
effect on the next page load rather than in eight hours. The JWT is not
changed to carry permissions — a token that outlives a revocation is exactly
the failure this design already avoids.

### 4.2 Enforcement, in three places

1. `proxy.ts` — unchanged. Proves the cookie is signed; nothing more.
2. Every page — `requireAdmin()`, plus `requirePermission("…")` where the page
   is role-gated.
3. **Every server action re-checks the session and the permission itself.**
   This is not belt-and-braces: a server action is a public HTTP endpoint, and
   `lib/admin/actions.ts` already says so in its header. A form that only
   renders behind a login is not authorisation.

### 4.3 Admin management pages

`/admin/team/` (list), `/admin/team/new/`, `/admin/team/[id]/`, and
`/admin/profile/` for the signed-in admin's own name, email and password.

Guards, each of which is a real failure mode and not a hypothetical:

- A super admin cannot delete or deactivate **their own** account, and cannot
  demote themselves out of `SUPER_ADMIN`.
- The **last active super admin** cannot be deleted, deactivated or demoted,
  whoever attempts it. Otherwise the panel becomes unadministrable and the fix
  is a database console.
- Delete is a soft delete (`active = false` plus a `deletedAt`) where the
  account authored content — the `authorId` on a revision must stay
  resolvable. Hard delete only for accounts that never wrote anything.
- Password is set, never displayed; changing another admin's password is a
  super-admin action and forces no reuse of the old hash. Minimum length
  enforced in Zod, hashed with the same bcrypt cost already in use.
- Every one of these writes an `AuditLog` row.

---

## 5. The editor

### 5.1 Shape

Two panes on a laptop, tabbed on a phone:

- **Left — the block list.** Add, delete, reorder, duplicate. Each block is
  edited in place in something that looks like the finished block, not in a
  form field beside it.
- **Right — live preview.** The real `RichText` component, rendering the real
  `ContentBlock[]`, inside the real `(main)` stylesheet.

The preview is genuinely the site's own rendering, not a lookalike. That is
the whole payoff of §1.3: because the editor's state *is* `ContentBlock[]`,
the preview needs no translation layer and cannot drift from the live page.

The one wrinkle is that `(main)/globals.css` and `admin.css` are separate root
layouts and must not meet on one page (`--color-muted` means different things
in each — `CLAUDE.md` calls this load-bearing). So the in-editor preview
renders inside an **iframe** pointing at a `(main)`-group preview route, which
keeps the two stylesheets apart exactly as the three-root-layout split
intends. Full-page preview (§6) uses draft mode on the real URL.

### 5.2 Inline formatting

Body text stores `**bold**`, `*italic*`, `[text](url)` because that is what
`renderInline` parses and what 3,371 lines of existing copy contain. The owner
must never type those markers.

**Recommendation: TipTap** (`@tiptap/react`, `@tiptap/starter-kit`,
`@tiptap/extension-link`), configured down to bold, italic and link and
nothing else, with a ~80-line serializer between TipTap's document and the
marker string. Storage stays in the marker format, so the editor library is
replaceable and nothing about the render path depends on it.

Hand-rolling `contenteditable` was considered and rejected: selection handling
across browsers is a known bug farm, and the brief's first priority is that a
non-technical user can rely on it.

The link control must enforce the internal-link rule from `CLAUDE.md`: a link
is internal only when it starts exactly `https://flexandflow.fit`;
`flexandflow.id` is normalised to `.fit` on paste, or it silently ships as an
external new-tab link through a redirect.

### 5.3 Guard rails the editor owes the content

- Inline markers only run on `paragraph`, `list`, `columns` and `faq`.
  `heading` and `callout` render raw — so the editor **disables** the
  bold/italic/link controls in those two, rather than letting someone add
  formatting that ships as literal asterisks.
- Straight apostrophes are converted to `’` on paste, because the copy is
  typographic throughout and arrives from Google Docs straight.
- Slug edits on a published document warn loudly and offer to write a 308 into
  `next.config.ts`… which cannot be written at runtime. So instead: slug
  changes on published documents are **blocked by default** and require a
  super admin, who is shown the indexed URL that will break. Changing a slug
  is how indexed traffic gets thrown away.
- `canonicalPath` is derived from `urlPrefix` + `slug` and shown read-only,
  with an override for the two-services-with-no-menu case.

---

## 6. Draft, preview, publish

- **Draft** is `ContentDoc.draftRevision`. Saving writes a new
  `ContentRevision` and repoints `draftRevisionId`. The live page is untouched
  because it reads `publishedRevision`.
- **Preview** uses Next's Draft Mode. `GET /api/cms/preview/` requires a live
  admin session and a `content.view` permission, calls `draftMode().enable()`,
  and redirects to the document's real URL. The page's loader checks
  `(await draftMode()).isEnabled` and reads the draft revision. Draft mode
  bypasses the cache, so what is shown is current. A banner with an "exit
  preview" link renders while it is on.
- **Publish** points `publishedRevisionId` at the current draft, sets
  `status`/`publishedAt`, then revalidates the tags and paths in §2.2.
- **Unpublish** clears `publishedRevisionId` and `status`, revalidates, and —
  this is the part that is easy to get wrong — the route must then return a
  real 404 rather than a blank page, and the URL must drop out of
  `app/sitemap.ts`.
- **Revision history** is free, because revisions are immutable rows. "Restore
  this version" copies an old revision into a new draft.

---

## 7. Media

`lib/cms/storage.ts` is a two-driver adapter:

- **local** (development) — writes under `public/uploads/`, which is
  gitignored. Selected whenever the S3 variables are absent, so a checkout
  with no bucket configured still runs the whole CMS.
- **s3** (production) — any S3-compatible endpoint; configured for Cloudflare
  R2 behind `media.flexandflow.fit` (§10.1). The same driver serves S3, B2 and
  MinIO unchanged.

Stored URLs are always absolute against the configured public base, never
against the bucket's own hostname. That is what makes the custom domain worth
having: change the provider and no stored URL moves.

Upload flow: hash the bytes → if the checksum already exists, return that
`MediaAsset` (this is the "no unnecessary duplicates" requirement, answered
exactly) → otherwise store, read intrinsic dimensions, write the row.

Dimensions are recorded because `next/image` needs explicit `width`/`height`
here and the blog listing's masonry packing uses `imageWidth`/`imageHeight`.
An image inserted without them shifts the layout.

The 64 existing files under `public/images/` are imported as `MediaAsset` rows
pointing at their current static paths, so the picker is populated from day
one and no existing reference changes. Those rows are marked non-deletable —
they are referenced by ported copy and by git history.

Deleting an asset that a published revision references is refused, with the
list of pages using it.

---

## 8. Migration, and not breaking the site

### 8.1 Import

`scripts/cms-import.ts` reads `lib/data/services.ts` and `lib/data/posts.ts` —
the modules, not the text — and writes a `ContentDoc` plus one published
`ContentRevision` for each of the 17 documents. Because it imports the real
modules, the copy cannot be mangled in transit: what goes in is the object the
site renders today.

Verification is a diff, not an eyeball: after import, serialise every document
back out through the loader and compare it to the source module. Byte
equality, or the import is wrong. That is the check that catches a lost
apostrophe or a dropped `bannerImage`.

### 8.2 Cutover

The TypeScript files stay in git. They stop being read by pages and remain the
record of the port and the input to `prisma/seed.ts`.

Twelve call sites become async (§1.8). Each is mechanical. The two that need
thought:

- `lib/pricing.ts:lowestHourlyRate()` currently reads the `services` array at
  module scope. It becomes async and takes the services as an argument, so
  `lib/pricing.ts` stops importing content at all — which is the right shape
  anyway, since everything else in that file is already a pure function.
- `app/(main)/preview/{a,b,c,d}/` are deleted (§10.4), which removes four of
  the twelve call sites outright.

### 8.3 What must still be true afterwards

- All 27 indexable URLs unchanged, trailing slashes intact.
- Titles, descriptions and `robots` byte-identical (`SITE-STRUCTURE.md` has
  the `curl` check).
- `full-body-massage` and `facial-massage` still absent from the `/services`
  grid and from `primaryNav`, still reachable, still `tiers: []`.
- `npm run check:prices` still passes.
- `npm run build` still generates the same page count, plus the CMS routes.
- 390 / 768 / 1280px with no horizontal overflow.

---

## 9. Phases

| # | Phase | Delivers |
|---|---|---|
| 1 | Audit | this document |
| 2 | Plan | this document |
| 3 | Schema & auth | migrations, `AdminRole`, permissions, admin CRUD, profile, guards |
| 4 | Read layer | `lib/cms/read.ts`, import script, byte-equality verification, 12 call sites moved, site still identical |
| 5 | Media | `MediaAsset`, storage adapter, upload, picker, import of the 64 existing files |
| 6 | Editor core | block editor, TipTap inline, iframe preview, draft/publish, revisions |
| 7 | Treatments & blog | the two document types wired end to end, listings, search, dashboard |
| 8 | Verification | §8.3, top to bottom |

Phase 4 is the one that can break the public site, and it is deliberately
separated from the editor so it can be verified on its own: after Phase 4 the
site reads from the database and looks *identical*, with no editor in front of
it yet. If anything is wrong, it is wrong before any content has been edited.

---

## 10. Decisions — settled 2026-09-01

1. **Image storage: Cloudflare R2, behind a custom domain, through an
   S3-compatible driver.** The owner asked for whatever holds up longest.

   The deciding argument is specific to a CMS and not about price: **published
   content stores image URLs.** Once an article is live and indexed, its image
   URLs are load-bearing — in the page, in Google Images, in anything that has
   linked it. A URL on `*.blob.vercel-storage.com` is a URL owned by the
   hosting provider, and moving host later breaks every image in every article
   at once. `media.flexandflow.fit` in front of the bucket is owned by the
   studio and survives any provider change.

   Supporting reasons: R2 charges **no egress**, and images are the
   bandwidth-heavy asset on this site; and the S3 API means the same driver
   runs against R2, S3, Backblaze B2 or MinIO, so the provider is a
   configuration line rather than a rewrite.

   The cost is real and worth stating: a Cloudflare account, a bucket, an API
   token and a DNS record — roughly fifteen minutes of setup the owner has to
   do, against Vercel Blob's single environment variable. Development runs on
   the local-disk driver from the first commit, so none of that blocks Phase 5.

   `next.config.ts` needs the media host in `images.remotePatterns`.

2. **The CMS edits the marketing tiers.** *(Owner's choice; the alternative —
   deriving them read-only from `ServiceVariant` — was recommended and not
   taken. Recorded here so the reasoning is not re-litigated later.)*

   Prices therefore stay in two places, and `npm run check:prices` remains the
   guard that this repo has needed three times. Two things follow, and they
   are requirements, not nice-to-haves:

   - The treatment editor shows a **live divergence warning**: when an edited
     tier disagrees with the matching `ServiceVariant`, it says so in the
     editor, naming both figures, before the document can be published. CI
     catching it later means it was already published wrong.
   - The tier editor writes digits only, and `lib/pricing.ts:priceAmount`
     stays the single reader. Some ported strings carry an `Rp` prefix and
     some do not (§1.9.2); the editor must not add a third spelling.

3. **Home and About Us stay out of scope.** Treatments and blog only, per the
   brief. Those two pages are composed sections (`Hero`, `Treatments`,
   `Practitioners`, `Faqs`), not documents, and modelling them as content is a
   different piece of work to be proposed separately if it is ever wanted.

4. **`/preview/{a,b,c,d}` are deleted.** All four were rejected and are
   superseded by the live page; they still carry Phase 1 classes. The history
   is in git. This also removes four of the twelve call sites in §1.8.
