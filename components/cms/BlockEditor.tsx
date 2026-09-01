"use client";

import Image from "next/image";
import { useState } from "react";

import { InlineText } from "@/components/cms/InlineText";
import { MediaPicker, type PickedImage } from "@/components/cms/MediaPicker";
import {
  BLOCK_HINT,
  BLOCK_LABEL,
  BLOCK_TYPES,
  emptyBlock,
  type BlockType,
} from "@/lib/cms/blocks";
import type { ContentBlock, ContentImage } from "@/types";

/**
 * The body, as a list of blocks you can add to, edit, reorder and remove.
 *
 * Each block is edited in something shaped like the thing it becomes, not in a
 * form field beside it — a heading is a big line, a paragraph is a paragraph,
 * a list is a list. The preview beside it is the site's own renderer, so the
 * gap between this and the page is only the site's typography.
 *
 * Blocks whose text `RichText` renders **raw** (`heading`, `callout`) get no
 * bold/italic/link controls, because a mark in one of those reaches the page as
 * literal asterisks. That is a real limit of the stored format and it is drawn
 * here rather than explained in a document nobody reads.
 */

/**
 * What each level is for, in the owner's terms rather than in HTML's.
 *
 * Nesting is what these actually mean — H3 belongs under an H2, not merely
 * smaller than one — and a control labelled "Large / Medium / Small" hid that
 * entirely. Since the labels are now H1-H6, the explanation has to come with
 * them.
 */
const HEADING_HINT: Record<1 | 2 | 3 | 4 | 5 | 6, string> = {
  1: "The page's main title. Already used at the top of the page.",
  2: "A main section of the article. The usual choice.",
  3: "A sub-section, inside an H2.",
  4: "A point inside an H3.",
  5: "Rarely needed — a level below H4.",
  6: "The smallest, shown in small capitals.",
};

type ImageTarget =
  | { kind: "block"; index: number }
  | { kind: "gallery"; index: number; at: number };

export function BlockEditor({
  blocks,
  onChange,
}: {
  blocks: ContentBlock[];
  onChange: (blocks: ContentBlock[]) => void;
}) {
  const [adding, setAdding] = useState<number | null>(null);
  const [picking, setPicking] = useState<ImageTarget | null>(null);

  function replace(index: number, block: ContentBlock) {
    onChange(blocks.map((existing, i) => (i === index ? block : existing)));
  }

  function insert(at: number, type: BlockType) {
    const next = [...blocks];
    next.splice(at, 0, emptyBlock(type));
    onChange(next);
    setAdding(null);
  }

  function remove(index: number) {
    onChange(blocks.filter((_, i) => i !== index));
  }

  function duplicate(index: number) {
    const next = [...blocks];
    /* Structured clone rather than a spread: nested `items` and `images`
       arrays would otherwise be shared, and editing the copy would silently
       edit the original. */
    next.splice(index + 1, 0, structuredClone(blocks[index]));
    onChange(next);
  }

  function move(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= blocks.length) return;
    const next = [...blocks];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  }

  function applyImage(picked: PickedImage) {
    if (!picking) return;

    if (picking.kind === "block") {
      const block = blocks[picking.index];
      if (block.type === "image" || block.type === "imageText") {
        replace(picking.index, {
          ...block,
          src: picked.src,
          /* An existing alt is kept: it was written for this spot, and the
             library's default is a fallback rather than an override. */
          alt: block.alt || picked.alt,
          width: picked.width,
          height: picked.height,
        });
      }
      return;
    }

    const block = blocks[picking.index];
    if (block.type !== "gallery") return;

    const images = [...block.images];
    const entry: ContentImage = {
      src: picked.src,
      alt: picked.alt,
      width: picked.width,
      height: picked.height,
    };

    if (picking.at >= images.length) images.push(entry);
    else images[picking.at] = entry;

    replace(picking.index, { ...block, images });
  }

  return (
    <div className="grid gap-3">
      <AddRow
        open={adding === 0}
        onOpen={() => setAdding(adding === 0 ? null : 0)}
        onPick={(type) => insert(0, type)}
        label={blocks.length === 0 ? "Add the first block" : "Add at the top"}
      />

      {blocks.map((block, index) => (
        <div key={index} className="grid gap-3">
          <section className="cms-block">
            <header className="cms-block-head">
              <span className="cms-block-kind">
                {BLOCK_LABEL[block.type as BlockType] ?? block.type}
              </span>

              <div className="flex flex-wrap items-center gap-1">
                <IconButton
                  label="Move up"
                  disabled={index === 0}
                  onClick={() => move(index, -1)}
                >
                  ↑
                </IconButton>
                <IconButton
                  label="Move down"
                  disabled={index === blocks.length - 1}
                  onClick={() => move(index, 1)}
                >
                  ↓
                </IconButton>
                <IconButton label="Duplicate" onClick={() => duplicate(index)}>
                  ⧉
                </IconButton>
                <IconButton
                  label="Delete this block"
                  danger
                  onClick={() => remove(index)}
                >
                  ✕
                </IconButton>
              </div>
            </header>

            <div className="p-3">
              <BlockFields
                block={block}
                onChange={(next) => replace(index, next)}
                onPickImage={(target) => setPicking(target)}
                index={index}
              />
            </div>
          </section>

          <AddRow
            open={adding === index + 1}
            onOpen={() => setAdding(adding === index + 1 ? null : index + 1)}
            onPick={(type) => insert(index + 1, type)}
            label="Add here"
          />
        </div>
      ))}

      <MediaPicker
        open={picking !== null}
        onClose={() => setPicking(null)}
        onPick={applyImage}
      />
    </div>
  );
}

// ── Chrome ────────────────────────────────────────────────────────────────

function IconButton({
  children,
  label,
  onClick,
  disabled,
  danger,
}: {
  children: React.ReactNode;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={label}
      aria-label={label}
      className={`cms-icon-btn${danger ? " is-danger" : ""}`}
    >
      {children}
    </button>
  );
}

function AddRow({
  open,
  onOpen,
  onPick,
  label,
}: {
  open: boolean;
  onOpen: () => void;
  onPick: (type: BlockType) => void;
  label: string;
}) {
  return (
    <div>
      <button type="button" onClick={onOpen} className="cms-add-row">
        <span aria-hidden>+</span> {label}
      </button>

      {open ? (
        <div className="cms-add-menu">
          {BLOCK_TYPES.map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => onPick(type)}
              className="cms-add-option"
            >
              <span className="block text-[13px] font-bold text-ink">
                {BLOCK_LABEL[type]}
              </span>
              <span className="mt-0.5 block text-[12px] text-muted">
                {BLOCK_HINT[type]}
              </span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return <span className="admin-label">{children}</span>;
}

// ── Per-type fields ───────────────────────────────────────────────────────

function BlockFields({
  block,
  onChange,
  onPickImage,
  index,
}: {
  block: ContentBlock;
  onChange: (block: ContentBlock) => void;
  onPickImage: (target: ImageTarget) => void;
  index: number;
}) {
  switch (block.type) {
    case "heading":
      return (
        <div className="grid gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <Label>Level</Label>
            {([1, 2, 3, 4, 5, 6] as const).map((level) => (
              <button
                key={level}
                type="button"
                onClick={() => onChange({ ...block, level })}
                className={`cms-chip${block.level === level ? " is-on" : ""}`}
                title={HEADING_HINT[level]}
              >
                H{level}
              </button>
            ))}
          </div>

          {/* Said here, at the moment of the choice, rather than in a document
              nobody opens. The page title is already the document's only h1
              (`PageHero`), so a second one flattens the outline that screen
              readers and search engines navigate the page by. The choice is
              still available — this is a warning, not a lock. */}
          {block.level === 1 ? (
            <p className="rounded-[6px] bg-warn-soft px-2 py-1.5 text-[12px] text-warn">
              <strong className="font-bold">H1 is already used</strong> by the
              page title at the top. A second H1 in the body confuses search
              engines and screen readers about what the page is about — H2 is
              almost always the right choice for a section title.
            </p>
          ) : (
            <p className="text-[12px] text-faint">
              {HEADING_HINT[block.level]}
            </p>
          )}

          {/* No marks: `RichText` renders headings raw. */}
          <InlineText
            value={block.text}
            marks={false}
            ariaLabel="Heading text"
            onChange={(text) => onChange({ ...block, text })}
          />
          <p className="text-[12px] text-faint">
            Headings cannot carry bold, italic or links — the site prints them
            plain.
          </p>
        </div>
      );

    case "paragraph":
      return (
        <InlineText
          value={block.text}
          ariaLabel="Paragraph text"
          placeholder="Write here…"
          onChange={(text) => onChange({ ...block, text })}
        />
      );

    case "list":
    case "columns": {
      const isColumns = block.type === "columns";
      /* Only the list block carries it; the star-bullet columns are never
         numbered. Narrowed once here so the shared markup below can read it. */
      const ordered = block.type === "list" ? Boolean(block.ordered) : false;
      return (
        <div className="grid gap-2">
          {!isColumns ? (
            <label className="flex items-center gap-2 text-[13px] font-bold text-ink">
              <input
                type="checkbox"
                checked={ordered}
                onChange={(event) =>
                  onChange({ ...block, ordered: event.target.checked })
                }
                className="size-4"
              />
              Numbered
            </label>
          ) : (
            <p className="text-[12px] text-faint">
              Olive star bullets, filling two columns down the page — the style
              the benefit lists already use.
            </p>
          )}

          {block.items.map((item, i) => (
            <div key={i} className="flex items-start gap-2">
              <span className="mt-2 w-4 shrink-0 text-[12px] text-faint">
                {ordered ? `${i + 1}.` : "•"}
              </span>
              <div className="min-w-0 flex-1">
                <InlineText
                  value={item}
                  ariaLabel={`Item ${i + 1}`}
                  onChange={(text) => {
                    const items = [...block.items];
                    items[i] = text;
                    onChange({ ...block, items });
                  }}
                />
              </div>
              <IconButton
                label="Remove item"
                danger
                disabled={block.items.length === 1}
                onClick={() =>
                  onChange({
                    ...block,
                    items: block.items.filter((_, j) => j !== i),
                  })
                }
              >
                ✕
              </IconButton>
            </div>
          ))}

          <div>
            <button
              type="button"
              className="admin-btn admin-btn-quiet"
              onClick={() => onChange({ ...block, items: [...block.items, ""] })}
            >
              Add item
            </button>
          </div>
        </div>
      );
    }

    case "image":
      return (
        <ImageField
          image={block}
          onPick={() => onPickImage({ kind: "block", index })}
          onAlt={(alt) => onChange({ ...block, alt })}
        />
      );

    case "imageText":
      return (
        <div className="grid gap-3">
          <ImageField
            image={block}
            onPick={() => onPickImage({ kind: "block", index })}
            onAlt={(alt) => onChange({ ...block, alt })}
          />
          <div className="flex flex-wrap items-center gap-2">
            <Label>Picture on the</Label>
            {(["left", "right"] as const).map((side) => (
              <button
                key={side}
                type="button"
                onClick={() => onChange({ ...block, side })}
                className={`cms-chip${(block.side ?? "left") === side ? " is-on" : ""}`}
              >
                {side}
              </button>
            ))}
          </div>
          <InlineText
            value={block.text}
            ariaLabel="Text beside the image"
            onChange={(text) => onChange({ ...block, text })}
          />
        </div>
      );

    case "gallery":
      return (
        <div className="grid gap-2">
          {block.images.length === 0 ? (
            <p className="text-[13px] text-faint">No pictures yet.</p>
          ) : (
            <ul className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {block.images.map((image, i) => (
                <li key={i} className="grid gap-1">
                  <span className="relative block aspect-[4/3] overflow-hidden rounded-[6px] border border-line bg-cream">
                    {image.src ? (
                      <Image
                        src={image.src}
                        alt=""
                        fill
                        sizes="160px"
                        className="object-cover"
                        unoptimized
                      />
                    ) : null}
                  </span>
                  <div className="flex gap-1">
                    <button
                      type="button"
                      className="cms-chip flex-1"
                      onClick={() => onPickImage({ kind: "gallery", index, at: i })}
                    >
                      Replace
                    </button>
                    <IconButton
                      label="Remove picture"
                      danger
                      onClick={() =>
                        onChange({
                          ...block,
                          images: block.images.filter((_, j) => j !== i),
                        })
                      }
                    >
                      ✕
                    </IconButton>
                  </div>
                </li>
              ))}
            </ul>
          )}

          <div>
            <button
              type="button"
              className="admin-btn admin-btn-quiet"
              onClick={() =>
                onPickImage({ kind: "gallery", index, at: block.images.length })
              }
            >
              Add picture
            </button>
          </div>
        </div>
      );

    case "callout":
      return (
        <div className="grid gap-2">
          <InlineText
            value={block.text}
            marks={false}
            ariaLabel="Highlight text"
            onChange={(text) => onChange({ ...block, text })}
          />
          <p className="text-[12px] text-faint">
            One sentence, on the olive box. Plain text only — the site prints
            this one raw.
          </p>
        </div>
      );

    case "quote":
      return (
        <div className="grid gap-2">
          <InlineText
            value={block.text}
            ariaLabel="Quote"
            onChange={(text) => onChange({ ...block, text })}
          />
          <div>
            <Label>Who said it (optional)</Label>
            <input
              type="text"
              value={block.attribution ?? ""}
              onChange={(event) =>
                onChange({ ...block, attribution: event.target.value })
              }
              className="admin-input"
              placeholder="Ginny, Master Therapist"
            />
          </div>
        </div>
      );

    case "faq":
      return (
        <div className="grid gap-3">
          {block.items.map((item, i) => (
            <div key={i} className="rounded-[8px] border border-line p-2.5">
              <div className="mb-1 flex items-center justify-between gap-2">
                <Label>Question {i + 1}</Label>
                <IconButton
                  label="Remove question"
                  danger
                  disabled={block.items.length === 1}
                  onClick={() =>
                    onChange({
                      ...block,
                      items: block.items.filter((_, j) => j !== i),
                    })
                  }
                >
                  ✕
                </IconButton>
              </div>

              <InlineText
                value={item.question}
                ariaLabel={`Question ${i + 1}`}
                onChange={(question) => {
                  const items = [...block.items];
                  items[i] = { ...items[i], question };
                  onChange({ ...block, items });
                }}
              />

              <div className="mt-2">
                <Label>Answer</Label>
                <InlineText
                  value={item.answer}
                  ariaLabel={`Answer ${i + 1}`}
                  onChange={(answer) => {
                    const items = [...block.items];
                    items[i] = { ...items[i], answer };
                    onChange({ ...block, items });
                  }}
                />
              </div>
            </div>
          ))}

          <div>
            <button
              type="button"
              className="admin-btn admin-btn-quiet"
              onClick={() =>
                onChange({
                  ...block,
                  items: [...block.items, { question: "", answer: "" }],
                })
              }
            >
              Add question
            </button>
          </div>
        </div>
      );

    case "cta":
      return (
        <div className="grid gap-2 sm:grid-cols-2">
          <div>
            <Label>Button text</Label>
            <input
              type="text"
              value={block.label}
              onChange={(event) => onChange({ ...block, label: event.target.value })}
              className="admin-input"
              placeholder="Book a session"
            />
          </div>
          <div>
            <Label>Link</Label>
            <input
              type="text"
              value={block.href}
              onChange={(event) => onChange({ ...block, href: event.target.value })}
              className="admin-input"
              placeholder="https://flexandflow.fit/price-list/"
            />
            <p className="mt-1 text-[12px] text-faint">
              Addresses starting <code>https://flexandflow.fit</code> stay on
              this site. Anything else opens in a new tab.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 sm:col-span-2">
            <Label>Style</Label>
            {(["solid", "outline"] as const).map((variant) => (
              <button
                key={variant}
                type="button"
                onClick={() => onChange({ ...block, variant })}
                className={`cms-chip${(block.variant ?? "solid") === variant ? " is-on" : ""}`}
              >
                {variant === "solid" ? "Filled" : "Outlined"}
              </button>
            ))}
          </div>
        </div>
      );

    case "divider":
      return (
        <div className="grid gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <Label>Space</Label>
            {(["small", "medium", "large"] as const).map((space) => (
              <button
                key={space}
                type="button"
                onClick={() => onChange({ ...block, space })}
                className={`cms-chip${(block.space ?? "medium") === space ? " is-on" : ""}`}
              >
                {space}
              </button>
            ))}
          </div>
          <label className="flex items-center gap-2 text-[13px] font-bold text-ink">
            <input
              type="checkbox"
              checked={block.rule !== false}
              onChange={(event) => onChange({ ...block, rule: event.target.checked })}
              className="size-4"
            />
            Draw a line
          </label>
        </div>
      );

    default:
      return (
        <p className="text-[13px] text-danger">
          This block type is not editable in this version of the panel.
        </p>
      );
  }
}

function ImageField({
  image,
  onPick,
  onAlt,
}: {
  image: ContentImage;
  onPick: () => void;
  onAlt: (alt: string) => void;
}) {
  return (
    <div className="grid gap-2 sm:grid-cols-[160px_minmax(0,1fr)] sm:items-start">
      <button
        type="button"
        onClick={onPick}
        className="relative block aspect-[4/3] overflow-hidden rounded-[8px] border border-line bg-cream text-[12px] text-faint transition-colors hover:border-olive"
      >
        {image.src ? (
          <Image
            src={image.src}
            alt=""
            fill
            sizes="160px"
            className="object-cover"
            unoptimized
          />
        ) : (
          <span className="flex h-full items-center justify-center">
            Choose a picture
          </span>
        )}
      </button>

      <div className="grid gap-2">
        <div>
          <Label>Describe the picture</Label>
          <input
            type="text"
            value={image.alt}
            onChange={(event) => onAlt(event.target.value)}
            className="admin-input"
            placeholder="A therapist stretching a client's hamstring"
          />
          <p className="mt-1 text-[12px] text-faint">
            Read aloud to people using a screen reader, and shown if the picture
            fails to load. Leave it empty only if the picture is decoration.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={onPick} className="admin-btn admin-btn-quiet">
            {image.src ? "Replace picture" : "Choose picture"}
          </button>
          {image.src ? (
            <span className="text-[12px] text-faint">
              {image.width}×{image.height}
            </span>
          ) : null}
        </div>
      </div>
    </div>
  );
}
