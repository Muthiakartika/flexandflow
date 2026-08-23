"use client";

import { useMemo } from "react";

/**
 * A QR code, drawn here rather than fetched or imported.
 *
 * QRIS hands us a payload string and expects the merchant to render it. There
 * is no dependency for this in the project and there is not going to be one:
 * a QR encoder is a fixed, forty-year-old specification with no upstream to
 * track, and adding a package to the client bundle of a booking flow to draw
 * about a thousand black squares is a poor trade. So the encoder is below, and
 * the output is one inline `<path>` — no canvas, no image request, nothing that
 * can fail to load while somebody is holding their phone up to the screen.
 *
 * **Error correction is level M**, which is what EMVCo and Bank Indonesia
 * specify for QRIS. It is not a knob: a QRIS printed at level L is out of
 * spec, and at level Q or H it needs a larger symbol for no benefit at the
 * distance a phone camera works from.
 *
 * The implementation follows ISO/IEC 18004 in the order the standard states
 * it — encode, error-correct, interleave, place, mask, then write the format
 * bits describing the mask that was actually applied. Every table below was
 * checked against the standard's own capacity figures (version 13-M holds 334
 * data codewords, version 40-M holds 2,334) and against its worked example
 * (version 1-M, `01234567`, which must produce the codewords
 * `10 20 0C 56 61 80 EC 11 …` and the ECC `A5 24 D4 C1 ED 36 C7 87 2C 55`).
 * If any of it is edited, check it against those again: a QR code that is
 * subtly wrong still looks exactly like a QR code.
 */

/* ── Tables ──────────────────────────────────────────────────────────────── */

/* Both indexed by version, 1–40; slot 0 is padding so the version number can
   be used directly. Level M only — see the note above about why there is no
   choice of level here. */

const ECC_PER_BLOCK: readonly number[] = [
  -1, 10, 16, 26, 18, 24, 16, 18, 22, 22, 26, 30, 22, 22, 24, 24, 28, 28, 26,
  26, 26, 26, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28,
  28, 28, 28,
];

const BLOCKS: readonly number[] = [
  -1, 1, 1, 1, 2, 2, 4, 4, 4, 5, 5, 5, 8, 9, 9, 10, 10, 11, 13, 14, 16, 17, 17,
  18, 20, 21, 23, 25, 26, 28, 29, 31, 33, 35, 37, 38, 40, 43, 45, 47, 49,
];

/** Format-information bits for level M. L is 1, M is 0, Q is 3, H is 2. */
const ECC_FORMAT_BITS = 0;

const PENALTY_N1 = 3;
const PENALTY_N2 = 3;
const PENALTY_N3 = 40;
const PENALTY_N4 = 10;

/* ── Capacity ────────────────────────────────────────────────────────────── */

/**
 * How many modules a version leaves for data once the finder, timing and
 * alignment patterns are subtracted. Includes the remainder bits, which is why
 * the codeword count below floors rather than divides.
 */
function rawDataModules(version: number): number {
  let result = (16 * version + 128) * version + 64;

  if (version >= 2) {
    const alignCount = Math.floor(version / 7) + 2;
    result -= (25 * alignCount - 10) * alignCount - 55;
    if (version >= 7) result -= 36;
  }

  return result;
}

/** Data codewords available at this version, error correction removed. */
function dataCapacity(version: number): number {
  return (
    Math.floor(rawDataModules(version) / 8) -
    ECC_PER_BLOCK[version] * BLOCKS[version]
  );
}

/* ── Galois field arithmetic ─────────────────────────────────────────────── */

/** GF(2^8) multiplication, primitive polynomial x^8 + x^4 + x^3 + x^2 + 1. */
function gfMultiply(a: number, b: number): number {
  let result = 0;
  for (let i = 7; i >= 0; i--) {
    result = (result << 1) ^ ((result >>> 7) * 0x11d);
    result ^= ((b >>> i) & 1) * a;
  }
  return result & 0xff;
}

/** Coefficients of the divisor polynomial, highest term omitted. */
function eccDivisor(degree: number): number[] {
  const result = new Array<number>(degree).fill(0);
  result[degree - 1] = 1;

  let root = 1;
  for (let i = 0; i < degree; i++) {
    for (let j = 0; j < degree; j++) {
      result[j] = gfMultiply(result[j], root);
      if (j + 1 < degree) result[j] ^= result[j + 1];
    }
    root = gfMultiply(root, 0x02);
  }

  return result;
}

function eccRemainder(data: readonly number[], divisor: readonly number[]): number[] {
  const result = new Array<number>(divisor.length).fill(0);

  for (const byte of data) {
    const factor = byte ^ (result.shift() ?? 0);
    result.push(0);
    for (let i = 0; i < divisor.length; i++) {
      result[i] ^= gfMultiply(divisor[i], factor);
    }
  }

  return result;
}

/* ── Encoding ────────────────────────────────────────────────────────────── */

/**
 * Byte mode throughout.
 *
 * A QRIS payload is mostly digits and uppercase letters, so alphanumeric mode
 * would fit it into fewer modules — but it excludes lowercase and several
 * punctuation marks that merchant names legitimately contain, and a mode that
 * works for one merchant and truncates another is worse than a slightly denser
 * symbol.
 */
function toDataCodewords(bytes: Uint8Array, version: number): number[] {
  /* Ten bits of overhead: four for the mode indicator, then eight or sixteen
     for the length depending on version. */
  const lengthBits = version < 10 ? 8 : 16;

  const bits: number[] = [];
  const push = (value: number, count: number) => {
    for (let i = count - 1; i >= 0; i--) bits.push((value >>> i) & 1);
  };

  push(0b0100, 4);
  push(bytes.length, lengthBits);
  for (const byte of bytes) push(byte, 8);

  const capacityBits = dataCapacity(version) * 8;

  /* Terminator, then up to a byte boundary, then the two alternating pad
     codewords the standard names. */
  push(0, Math.min(4, capacityBits - bits.length));
  push(0, (8 - (bits.length % 8)) % 8);

  for (let pad = 0xec; bits.length < capacityBits; pad ^= 0xec ^ 0x11) {
    push(pad, 8);
  }

  const codewords: number[] = [];
  for (let i = 0; i < bits.length; i += 8) {
    let byte = 0;
    for (let j = 0; j < 8; j++) byte = (byte << 1) | bits[i + j];
    codewords.push(byte);
  }

  return codewords;
}

/**
 * Split into blocks, error-correct each, then interleave.
 *
 * The interleaving is the point: a scuff across the symbol damages one
 * codeword of every block rather than every codeword of one block, which is
 * the difference between a correctable error and an unreadable code.
 */
function addEccAndInterleave(data: readonly number[], version: number): number[] {
  const blockCount = BLOCKS[version];
  const eccLength = ECC_PER_BLOCK[version];
  const totalCodewords = Math.floor(rawDataModules(version) / 8);

  /* The blocks are not all the same length; the longer ones come last. */
  const shortBlocks = blockCount - (totalCodewords % blockCount);
  const shortLength = Math.floor(totalCodewords / blockCount);

  const divisor = eccDivisor(eccLength);
  const blocks: number[][] = [];

  let read = 0;
  for (let i = 0; i < blockCount; i++) {
    const short = i < shortBlocks;
    const dataLength = shortLength - eccLength + (short ? 0 : 1);
    const block = data.slice(read, read + dataLength);
    read += dataLength;

    /* A short block is given a hole where the long ones carry their extra
       data codeword, so every block can be indexed identically below. The
       hole is skipped when interleaving and never reaches the symbol. */
    const ecc = eccRemainder(block, divisor);
    blocks.push(short ? [...block, 0, ...ecc] : [...block, ...ecc]);
  }

  const result: number[] = [];
  for (let i = 0; i < shortLength + 1; i++) {
    for (let j = 0; j < blocks.length; j++) {
      if (i === shortLength - eccLength && j < shortBlocks) continue;
      result.push(blocks[j][i]);
    }
  }

  return result;
}

/* ── Matrix ──────────────────────────────────────────────────────────────── */

type Matrix = {
  size: number;
  modules: boolean[][];
  /** Function patterns are never masked and never carry data. */
  reserved: boolean[][];
};

function alignmentCentres(version: number): number[] {
  if (version === 1) return [];

  const count = Math.floor(version / 7) + 2;
  /* Version 32 is the one the general formula gets wrong; the standard lists
     its centres explicitly and they are 26 apart. */
  const step =
    version === 32 ? 26 : Math.ceil((version * 4 + 4) / (count * 2 - 2)) * 2;

  const result = [6];
  for (let pos = version * 4 + 10; result.length < count; pos -= step) {
    result.splice(1, 0, pos);
  }
  return result;
}

function blankMatrix(size: number): Matrix {
  const grid = () =>
    Array.from({ length: size }, () => new Array<boolean>(size).fill(false));
  return { size, modules: grid(), reserved: grid() };
}

function setFunction(matrix: Matrix, x: number, y: number, dark: boolean): void {
  if (x < 0 || y < 0 || x >= matrix.size || y >= matrix.size) return;
  matrix.modules[y][x] = dark;
  matrix.reserved[y][x] = true;
}

function drawFunctionPatterns(matrix: Matrix, version: number): void {
  const size = matrix.size;

  /* Timing lines, drawn first and then overwritten where the finders sit. */
  for (let i = 0; i < size; i++) {
    setFunction(matrix, 6, i, i % 2 === 0);
    setFunction(matrix, i, 6, i % 2 === 0);
  }

  /* Finders, with their separators: a 9×9 region around each centre, where
     the ring distance from the centre decides the colour. */
  for (const [cx, cy] of [
    [3, 3],
    [size - 4, 3],
    [3, size - 4],
  ]) {
    for (let dy = -4; dy <= 4; dy++) {
      for (let dx = -4; dx <= 4; dx++) {
        const distance = Math.max(Math.abs(dx), Math.abs(dy));
        setFunction(matrix, cx + dx, cy + dy, distance !== 2 && distance !== 4);
      }
    }
  }

  const centres = alignmentCentres(version);
  for (let i = 0; i < centres.length; i++) {
    for (let j = 0; j < centres.length; j++) {
      /* The three corners already hold finder patterns. */
      const corner =
        (i === 0 && j === 0) ||
        (i === 0 && j === centres.length - 1) ||
        (i === centres.length - 1 && j === 0);
      if (corner) continue;

      for (let dy = -2; dy <= 2; dy++) {
        for (let dx = -2; dx <= 2; dx++) {
          setFunction(
            matrix,
            centres[i] + dx,
            centres[j] + dy,
            Math.max(Math.abs(dx), Math.abs(dy)) !== 1,
          );
        }
      }
    }
  }

  /* Reserve the format areas. Their real contents are written last, once the
     mask has been chosen — see `drawFormatBits`. */
  drawFormatBits(matrix, 0);

  if (version >= 7) drawVersionBits(matrix, version);
}

function drawFormatBits(matrix: Matrix, mask: number): void {
  const size = matrix.size;
  const data = (ECC_FORMAT_BITS << 3) | mask;

  let remainder = data;
  for (let i = 0; i < 10; i++) {
    remainder = (remainder << 1) ^ ((remainder >>> 9) * 0x537);
  }
  const bits = (((data << 10) | remainder) ^ 0x5412) & 0x7fff;
  const bit = (i: number) => ((bits >>> i) & 1) === 1;

  /* First copy: down the left of the top-right finder, then across. */
  for (let i = 0; i <= 5; i++) setFunction(matrix, 8, i, bit(i));
  setFunction(matrix, 8, 7, bit(6));
  setFunction(matrix, 8, 8, bit(7));
  setFunction(matrix, 7, 8, bit(8));
  for (let i = 9; i < 15; i++) setFunction(matrix, 14 - i, 8, bit(i));

  /* Second copy, so the format survives damage to either corner. */
  for (let i = 0; i < 8; i++) setFunction(matrix, size - 1 - i, 8, bit(i));
  for (let i = 8; i < 15; i++) setFunction(matrix, 8, size - 15 + i, bit(i));

  /* The one module that is always dark, whatever else happens. */
  setFunction(matrix, 8, size - 8, true);
}

function drawVersionBits(matrix: Matrix, version: number): void {
  let remainder = version;
  for (let i = 0; i < 12; i++) {
    remainder = (remainder << 1) ^ ((remainder >>> 11) * 0x1f25);
  }
  const bits = (version << 12) | remainder;

  for (let i = 0; i < 18; i++) {
    const dark = ((bits >>> i) & 1) === 1;
    const a = matrix.size - 11 + (i % 3);
    const b = Math.floor(i / 3);
    setFunction(matrix, a, b, dark);
    setFunction(matrix, b, a, dark);
  }
}

/** Zigzag placement, bottom-right upwards, two columns at a time. */
function drawCodewords(matrix: Matrix, codewords: readonly number[]): void {
  const size = matrix.size;
  let bit = 0;

  for (let right = size - 1; right >= 1; right -= 2) {
    /* Column 6 is the vertical timing line, so the pairing skips over it. */
    if (right === 6) right = 5;

    for (let step = 0; step < size; step++) {
      for (let column = 0; column < 2; column++) {
        const x = right - column;
        const upward = ((right + 1) & 2) === 0;
        const y = upward ? size - 1 - step : step;

        if (matrix.reserved[y][x] || bit >= codewords.length * 8) continue;
        matrix.modules[y][x] =
          ((codewords[bit >>> 3] >>> (7 - (bit & 7))) & 1) === 1;
        bit++;
      }
    }
  }
}

function maskBit(mask: number, x: number, y: number): boolean {
  switch (mask) {
    case 0:
      return (x + y) % 2 === 0;
    case 1:
      return y % 2 === 0;
    case 2:
      return x % 3 === 0;
    case 3:
      return (x + y) % 3 === 0;
    case 4:
      return (Math.floor(x / 3) + Math.floor(y / 2)) % 2 === 0;
    case 5:
      return ((x * y) % 2) + ((x * y) % 3) === 0;
    case 6:
      return (((x * y) % 2) + ((x * y) % 3)) % 2 === 0;
    default:
      return (((x + y) % 2) + ((x * y) % 3)) % 2 === 0;
  }
}

function applyMask(matrix: Matrix, mask: number): void {
  for (let y = 0; y < matrix.size; y++) {
    for (let x = 0; x < matrix.size; x++) {
      if (matrix.reserved[y][x]) continue;
      matrix.modules[y][x] = matrix.modules[y][x] !== maskBit(mask, x, y);
    }
  }
}

/* ── Mask selection ──────────────────────────────────────────────────────── */

/* The standard's four penalty rules. They decide which of the eight masks is
   used; the format bits then record the answer, so an imperfect score costs a
   slightly less legible symbol, never an unreadable one. */

function countFinderLikeRuns(history: readonly number[]): number {
  const n = history[1];
  const core =
    n > 0 &&
    history[2] === n &&
    history[3] === n * 3 &&
    history[4] === n &&
    history[5] === n;

  return (
    (core && history[0] >= n * 4 && history[6] >= n ? 1 : 0) +
    (core && history[6] >= n * 4 && history[0] >= n ? 1 : 0)
  );
}

function pushRun(length: number, history: number[], size: number): void {
  /* A run that starts at the edge is treated as though the quiet zone were
     part of it, which is what makes the 1:1:3:1:1 test work at the border. */
  const run = history[0] === 0 ? length + size : length;
  history.pop();
  history.unshift(run);
}

function penalty(matrix: Matrix): number {
  const size = matrix.size;
  const at = (x: number, y: number) => matrix.modules[y][x];
  let score = 0;

  for (const transposed of [false, true]) {
    for (let major = 0; major < size; major++) {
      let colour = false;
      let run = 0;
      const history = [0, 0, 0, 0, 0, 0, 0];

      for (let minor = 0; minor < size; minor++) {
        const dark = transposed ? at(major, minor) : at(minor, major);

        if (dark === colour) {
          run++;
          if (run === 5) score += PENALTY_N1;
          else if (run > 5) score++;
        } else {
          pushRun(run, history, size);
          if (!colour) score += countFinderLikeRuns(history) * PENALTY_N3;
          colour = dark;
          run = 1;
        }
      }

      /* Terminate the final run against the quiet zone. */
      if (colour) {
        pushRun(run, history, size);
        run = 0;
      }
      pushRun(run + size, history, size);
      score += countFinderLikeRuns(history) * PENALTY_N3;
    }
  }

  for (let y = 0; y < size - 1; y++) {
    for (let x = 0; x < size - 1; x++) {
      const c = at(x, y);
      if (c === at(x + 1, y) && c === at(x, y + 1) && c === at(x + 1, y + 1)) {
        score += PENALTY_N2;
      }
    }
  }

  let dark = 0;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) if (at(x, y)) dark++;
  }
  const total = size * size;
  score +=
    (Math.ceil(Math.abs(dark * 20 - total * 10) / total) - 1) * PENALTY_N4;

  return score;
}

/* ── The encoder ─────────────────────────────────────────────────────────── */

/**
 * `null` when the payload is empty or larger than a version-40 symbol can
 * hold. The caller must handle that rather than draw something approximate:
 * see the note in `QrCode` about what a wrong QR code costs.
 */
export function encodeQr(text: string): boolean[][] | null {
  const bytes = new TextEncoder().encode(text);
  if (bytes.length === 0) return null;

  let version = 0;
  for (let candidate = 1; candidate <= 40; candidate++) {
    const headerBytes = candidate < 10 ? 2 : 3;
    if (dataCapacity(candidate) >= bytes.length + headerBytes) {
      version = candidate;
      break;
    }
  }
  if (version === 0) return null;

  const size = version * 4 + 17;
  const matrix = blankMatrix(size);
  drawFunctionPatterns(matrix, version);
  drawCodewords(
    matrix,
    addEccAndInterleave(toDataCodewords(bytes, version), version),
  );

  /* Try all eight, keep the least penalised, and leave that one applied. */
  let bestMask = 0;
  let bestScore = Number.POSITIVE_INFINITY;

  for (let mask = 0; mask < 8; mask++) {
    applyMask(matrix, mask);
    drawFormatBits(matrix, mask);
    const score = penalty(matrix);
    if (score < bestScore) {
      bestScore = score;
      bestMask = mask;
    }
    applyMask(matrix, mask);
  }

  applyMask(matrix, bestMask);
  drawFormatBits(matrix, bestMask);

  return matrix.modules;
}

/* ── The component ───────────────────────────────────────────────────────── */

/** Four modules of white on every side. Below that, scanners struggle. */
const QUIET_ZONE = 4;

/**
 * Renders `value` as a QR code, or renders nothing at all if it cannot.
 *
 * The white ground is drawn explicitly rather than left to the page: the modal
 * sits on cream, and a QR code with a cream quiet zone is a QR code some
 * cameras will not lock onto.
 */
export default function QrCode({
  value,
  label,
  className = "",
}: {
  value: string;
  /** Read out in place of the image; never the payload itself. */
  label: string;
  className?: string;
}) {
  /* Memoised because the modal around this re-renders once a second for its
     countdown, and encoding a version-13 symbol means scoring eight masks
     over five thousand modules each. It only ever changes when the payload
     does, which is when a new charge is opened. */
  const drawn = useMemo(() => {
    const modules = encodeQr(value);
    if (!modules) return null;

    const size = modules.length;
    let path = "";
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        if (modules[y][x]) {
          path += `M${x + QUIET_ZONE} ${y + QUIET_ZONE}h1v1h-1z`;
        }
      }
    }

    return { extent: size + QUIET_ZONE * 2, path };
  }, [value]);

  if (!drawn) return null;
  const { extent, path } = drawn;

  return (
    <svg
      viewBox={`0 0 ${extent} ${extent}`}
      role="img"
      aria-label={label}
      shapeRendering="crispEdges"
      className={className}
    >
      <rect width={extent} height={extent} fill="#ffffff" />
      <path d={path} fill="#000000" />
    </svg>
  );
}
