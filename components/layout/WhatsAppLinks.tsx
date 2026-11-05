"use client";

import { useEffect } from "react";

import { defaultMessage } from "@/lib/whatsapp";

/* The message the current page registered (`WhatsAppMessage`), if any. One
   page is on screen at a time, so a single slot is enough. */
let pageMessage: string | null = null;

/**
 * Registers this page's WhatsApp message while it is mounted. Renders
 * nothing. See `lib/whatsapp.ts`.
 */
export function WhatsAppMessage({ text }: { text: string }) {
  useEffect(() => {
    pageMessage = text;
    return () => {
      if (pageMessage === text) pageMessage = null;
    };
  }, [text]);
  return null;
}

/**
 * Adds the page's message to any plain `wa.me` link as it is clicked, so
 * every WhatsApp link on the site opens a chat that already says what the
 * visitor wants. Mounted once, in `SiteChrome`.
 *
 * At click time rather than in the markup, because most of these links are
 * shared (header, footer) or sit inside page copy, and none of them knows
 * which page it is on. The link's own address is kept on the element, so a
 * header link clicked on one page and again on the next gets the second
 * page's message, not the first's. Links that already carry a `text` (the
 * booking confirmation, the contact form) are left alone.
 */
export default function WhatsAppLinks() {
  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      const link = (event.target as Element | null)?.closest?.("a[href]");
      if (!(link instanceof HTMLAnchorElement)) return;

      const base = link.dataset.waBase ?? link.href;
      let url: URL;
      try {
        url = new URL(base);
      } catch {
        return;
      }
      if (url.hostname !== "wa.me" || url.searchParams.has("text")) return;

      link.dataset.waBase = base;
      url.searchParams.set("text", pageMessage ?? defaultMessage(window.location.pathname));
      link.href = url.toString();
    };

    /* Capture, so the address is set before the browser follows it; auxclick
       for a middle click that opens it in a new tab. */
    document.addEventListener("click", onClick, true);
    document.addEventListener("auxclick", onClick, true);
    return () => {
      document.removeEventListener("click", onClick, true);
      document.removeEventListener("auxclick", onClick, true);
    };
  }, []);

  return null;
}
