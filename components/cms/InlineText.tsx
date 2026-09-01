"use client";

import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { useEffect, useRef, useState } from "react";

import { htmlToMarkers, markersToHtml, smartenQuotes } from "@/lib/cms/inline";

/**
 * One editable run of text, with bold, italic and links — and nothing else.
 *
 * The owner never sees a marker. What is stored is `**bold**`, `*italic*` and
 * `[text](url)` because that is what `renderInline` parses and what the ported
 * copy contains; `lib/cms/inline.ts` carries it across, and
 * `npm run check:inline` proves the round trip is lossless over all 818
 * strings in the real content.
 *
 * ## Deliberately small
 *
 * StarterKit is cut down to a single paragraph with three marks. Headings,
 * lists, quotes and code blocks are all *blocks* in this CMS — giving the text
 * surface its own versions of them would produce structure the stored format
 * cannot represent and the renderer would silently drop.
 *
 * ## Bold and italic are mutually exclusive
 *
 * `***text***` matches neither of `renderInline`'s patterns, so it would reach
 * the page as literal asterisks. Rather than let someone apply both and lose
 * one on save, applying either clears the other — the limit is the storage
 * format's, and it is better felt in the toolbar than discovered on the site.
 */
export function InlineText({
  value,
  onChange,
  marks = true,
  placeholder,
  ariaLabel,
}: {
  /** The stored marker string. */
  value: string;
  onChange: (markers: string) => void;
  /**
   * False for headings and highlight boxes: `RichText` renders those raw, so a
   * link or a bold run in one ships as visible asterisks. The controls are
   * hidden rather than ignored.
   */
  marks?: boolean;
  placeholder?: string;
  ariaLabel?: string;
}) {
  const [focused, setFocused] = useState(false);
  /* What this component last emitted. Without it, the effect below treats its
     own change as an outside one and resets the cursor to the start on every
     keystroke. */
  const emitted = useRef(value);

  const editor = useEditor({
    /* The editor is created after mount rather than during SSR: TipTap warns
       about the hydration mismatch otherwise, and there is nothing worth
       server-rendering in a control that only exists behind a login. */
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: false,
        bulletList: false,
        orderedList: false,
        listItem: false,
        blockquote: false,
        codeBlock: false,
        code: false,
        strike: false,
        horizontalRule: false,
        /* Enter would otherwise insert a break this format cannot store. */
        hardBreak: false,
        link: marks
          ? {
              openOnClick: false,
              /* The editor is behind a login and the links are the studio's
                 own; autolinking a half-typed URL as somebody writes is more
                 often wrong than right. */
              autolink: false,
              HTMLAttributes: { rel: null, target: null },
            }
          : false,
        /* `false | options`, never a bare boolean — `true` is not a valid
           value for these in StarterKit v3. Undefined means "on with the
           defaults", which is what is wanted when marks are allowed. */
        bold: marks ? undefined : false,
        italic: marks ? undefined : false,
      }),
    ],
    content: markersToHtml(value),
    editorProps: {
      attributes: {
        class: "cms-inline-input",
        ...(ariaLabel ? { "aria-label": ariaLabel } : {}),
        ...(placeholder ? { "data-placeholder": placeholder } : {}),
      },
    },
    onUpdate({ editor: current }) {
      const markers = htmlToMarkers(current.getHTML());
      emitted.current = markers;
      onChange(markers);
    },
    onFocus: () => setFocused(true),
    onBlur: () => setFocused(false),
  });

  /* Outside changes only — restoring a revision, or switching which block is
     being edited. Comparing against what this editor last emitted is what
     tells the two apart. */
  useEffect(() => {
    if (!editor || value === emitted.current) return;
    emitted.current = value;
    editor.commands.setContent(markersToHtml(value), { emitUpdate: false });
  }, [editor, value]);

  if (!editor) {
    /* Same box, same height, so nothing moves when the editor mounts. */
    return (
      <div className="cms-inline-shell">
        <div className="cms-inline-input opacity-50">{value}</div>
      </div>
    );
  }

  const toggle = (mark: "bold" | "italic") => {
    const chain = editor.chain().focus();
    /* Clear the other one first — see the note at the top. */
    if (mark === "bold") chain.unsetItalic().toggleBold();
    else chain.unsetBold().toggleItalic();
    chain.run();
  };

  const setLink = () => {
    const existing = editor.getAttributes("link").href as string | undefined;
    const input = window.prompt(
      "Link address\n\n" +
        "A page on this site: https://flexandflow.fit/price-list/\n" +
        "Anywhere else opens in a new tab.\n\n" +
        "Leave empty to remove the link.",
      existing ?? "https://flexandflow.fit/",
    );

    if (input === null) return;

    const href = input.trim();

    if (!href) {
      editor.chain().focus().unsetLink().run();
      return;
    }

    /* `flexandflow.id` 301s to `.fit`, so a link written with it looks right in
       a browser but ships as an *external* new-tab link through a redirect —
       `renderInline` only treats an exact `https://flexandflow.fit` prefix as
       internal. Normalising here is the difference between an internal
       `next/link` and a round trip out of the site and back. */
    const normalised = href
      .replace(/^https?:\/\/(www\.)?flexandflow\.id/i, "https://flexandflow.fit")
      .replace(/^http:\/\/(www\.)?flexandflow\.fit/i, "https://flexandflow.fit")
      .replace(/^https:\/\/www\.flexandflow\.fit/i, "https://flexandflow.fit");

    editor.chain().focus().setLink({ href: normalised }).run();
  };

  const smarten = () => {
    const markers = htmlToMarkers(editor.getHTML());
    const fixed = smartenQuotes(markers);
    if (fixed === markers) return;
    emitted.current = fixed;
    editor.commands.setContent(markersToHtml(fixed), { emitUpdate: false });
    onChange(fixed);
  };

  return (
    <div className={`cms-inline-shell${focused ? " is-focused" : ""}`}>
      {marks ? (
        <div className="cms-inline-tools">
          <button
            type="button"
            /* `onMouseDown` with `preventDefault`, not `onClick`: clicking a
               button blurs the editor and drops the selection, so by the time
               the click fires there is nothing to make bold. */
            onMouseDown={(event) => {
              event.preventDefault();
              toggle("bold");
            }}
            aria-pressed={editor.isActive("bold")}
            className={`cms-tool${editor.isActive("bold") ? " is-on" : ""}`}
            title="Bold"
          >
            <strong>B</strong>
          </button>

          <button
            type="button"
            onMouseDown={(event) => {
              event.preventDefault();
              toggle("italic");
            }}
            aria-pressed={editor.isActive("italic")}
            className={`cms-tool${editor.isActive("italic") ? " is-on" : ""}`}
            title="Italic"
          >
            <em>I</em>
          </button>

          <button
            type="button"
            onMouseDown={(event) => {
              event.preventDefault();
              setLink();
            }}
            aria-pressed={editor.isActive("link")}
            className={`cms-tool${editor.isActive("link") ? " is-on" : ""}`}
            title="Link"
          >
            Link
          </button>

          <button
            type="button"
            onMouseDown={(event) => {
              event.preventDefault();
              smarten();
            }}
            className="cms-tool"
            title="Convert ' and &quot; to the curly quotes the site uses"
          >
            ’ ”
          </button>
        </div>
      ) : null}

      <EditorContent editor={editor} />
    </div>
  );
}
