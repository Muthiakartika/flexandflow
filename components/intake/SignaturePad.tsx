"use client";

import { forwardRef, useImperativeHandle, useRef, useState, type PointerEvent } from "react";

export type SignaturePadHandle = {
  isEmpty: () => boolean;
  clear: () => void;
  toBlob: () => Promise<Blob | null>;
};

/**
 * A canvas signature pad. `touch-action: none` on the canvas plus
 * `preventDefault()` in every pointer handler are both required, not
 * either-or — without both, a phone scrolls the page instead of drawing.
 *
 * The internal bitmap is a fixed 600×200 regardless of how wide the canvas
 * renders on screen, so every pointer position is rescaled from CSS pixels
 * into that coordinate space — skipping this makes the drawn line land
 * somewhere other than where the finger or cursor actually is on any screen
 * narrower than 600px, which is most phones.
 */
export const SignaturePad = forwardRef<
  SignaturePadHandle,
  {
    label: string;
    required: boolean;
    helpText?: string | null;
    error?: string;
  }
>(function SignaturePad({ label, required, helpText, error }, ref) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const hasDrawn = useRef(false);
  const [signed, setSigned] = useState(false);

  function point(event: PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (event.clientX - rect.left) * scaleX,
      y: (event.clientY - rect.top) * scaleY,
    };
  }

  function handlePointerDown(event: PointerEvent<HTMLCanvasElement>) {
    event.preventDefault();
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    /* Capture is what lets a drag continue past the canvas edge without the
       stroke breaking — a real convenience, not something drawing itself
       depends on. `setPointerCapture` throws `NotFoundError` for a pointer
       id the browser is not currently tracking as active, which does happen
       in the wild on some browser/input-device combinations; without this
       try/catch that throw aborts the rest of the handler and `drawing`
       never becomes true, so nothing the visitor does afterward draws
       anything — the pad looks broken with no error on screen. */
    try {
      canvas.setPointerCapture(event.pointerId);
    } catch {
      /* Drawing still works without capture; only off-canvas drag continuity is lost. */
    }
    drawing.current = true;

    ctx.strokeStyle = "#1a1a1a";
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    const { x, y } = point(event);
    ctx.beginPath();
    ctx.moveTo(x, y);
  }

  function handlePointerMove(event: PointerEvent<HTMLCanvasElement>) {
    if (!drawing.current) return;
    event.preventDefault();

    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;

    const { x, y } = point(event);
    ctx.lineTo(x, y);
    ctx.stroke();

    if (!hasDrawn.current) {
      hasDrawn.current = true;
      setSigned(true);
    }
  }

  function handlePointerUp(event: PointerEvent<HTMLCanvasElement>) {
    drawing.current = false;
    try {
      canvasRef.current?.releasePointerCapture(event.pointerId);
    } catch {
      /* Nothing to release — see the matching try/catch in handlePointerDown. */
    }
  }

  function clear() {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    hasDrawn.current = false;
    setSigned(false);
  }

  useImperativeHandle(ref, () => ({
    isEmpty: () => !hasDrawn.current,
    clear,
    toBlob: () =>
      new Promise((resolve) => {
        const canvas = canvasRef.current;
        if (!canvas) {
          resolve(null);
          return;
        }
        canvas.toBlob((blob) => resolve(blob), "image/png");
      }),
  }));

  return (
    <div>
      <label className="page-label mb-1.5 block">
        {label}
        {required ? (
          <span aria-hidden className="ml-1 text-red-600">
            *
          </span>
        ) : null}
      </label>

      <div className="rounded-[10px] border border-secondary/20 bg-white">
        <canvas
          ref={canvasRef}
          width={600}
          height={200}
          style={{ touchAction: "none", width: "100%", height: "200px" }}
          className="rounded-[10px]"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          onPointerLeave={handlePointerUp}
          aria-label={label}
          aria-invalid={Boolean(error && !signed) || undefined}
        />
      </div>

      <p role="status" className="mt-2 text-[13px] text-body-text/70">
        {signed ? "Signature added. Use Clear to draw it again." : "Draw your signature in the box above."}
      </p>

      <div className="mt-2 flex items-center justify-between gap-3">
        {helpText ? (
          <p className="text-[13px] text-body-text/60">{helpText}</p>
        ) : (
          <span />
        )}
        <button
          type="button"
          onClick={clear}
          className="shrink-0 text-[13px] underline decoration-secondary/25 underline-offset-[4px] transition-colors duration-300 hover:text-primary"
        >
          Clear
        </button>
      </div>

      {error && !signed ? (
        <p role="alert" className="mt-1.5 text-[13px] font-bold text-red-600">
          {error}
        </p>
      ) : null}
    </div>
  );
});
