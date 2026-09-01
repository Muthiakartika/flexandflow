import { draftMode } from "next/headers";

/**
 * The strip that says "you are looking at a draft".
 *
 * Draft Mode is a cookie on the whole browser, not on one tab. Without this
 * banner an editor previews one page, carries on browsing the site, and reads
 * unpublished copy everywhere without knowing it — then reports a bug about
 * text that is not live.
 *
 * Rendered in the public layout, above everything, and it is the only thing in
 * `(main)` that knows the CMS exists. For everybody else it renders nothing.
 */
export default async function PreviewBanner() {
  const { isEnabled } = await draftMode();
  if (!isEnabled) return null;

  return (
    <div className="sticky top-0 z-[60] bg-primary-strong px-4 py-2 text-center">
      <p className="font-body text-[13px] leading-tight text-white">
        <strong className="font-bold">Draft preview.</strong>{" "}
        <span className="opacity-90">
          You are seeing unpublished changes. Visitors see the published page.
        </span>{" "}
        {/* A plain `<a>`, and deliberately not `next/link`.
            Two reasons, both load-bearing:
            - `Link` prefetches, and prefetching a route handler whose whole job
              is to clear the draft cookie would drop somebody out of preview
              without them clicking anything. The Next docs call this out.
            - This has to work on a page whose JavaScript has not loaded, which
              is exactly when somebody is stuck in preview and wants out. */}
        {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
        <a
          href="/api/cms/preview/?exit=1"
          className="font-bold text-white underline underline-offset-2"
        >
          Leave preview
        </a>
      </p>
    </div>
  );
}
