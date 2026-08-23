/**
 * Turning an admin table into a file Excel opens without mangling it.
 *
 * Three things go wrong when a CSV is written naively, and all three are
 * handled here rather than at each call site:
 *
 * - **Formulas.** Excel and Sheets treat a cell beginning `=`, `+`, `-` or `@`
 *   as an expression to evaluate. A customer's phone number `+62 812-4747-4232`
 *   is exactly that shape and arrives in the spreadsheet as `-3927`; a name
 *   somebody typed into the booking form is an injection vector into whoever
 *   opens the file. Strings get a leading apostrophe when they start that way.
 *   Numbers never do — they are emitted raw, so a negative balance stays a
 *   negative number and every money column still sums.
 * - **Encoding.** Excel on Windows reads a CSV as the system codepage unless
 *   the file opens with a UTF-8 byte-order mark, which turns "Renée" into
 *   "RenÃ©e". The BOM is not optional here.
 * - **Line endings.** CRLF, because that is what Excel's importer expects.
 */

export type CsvValue = string | number | null | undefined;

const UTF8_BOM = "\uFEFF";

/** Anything a spreadsheet would try to evaluate rather than display. */
const FORMULA_START = /^[=+\-@\t\r]/;

const NEEDS_QUOTES = /["\r\n,]/;

export function csvCell(value: CsvValue): string {
  if (value === null || value === undefined) return "";

  /* Numbers go through untouched: they cannot carry a formula, and quoting or
     prefixing them would leave a column of text nobody can total. */
  if (typeof value === "number") {
    return Number.isFinite(value) ? String(value) : "";
  }

  const guarded = FORMULA_START.test(value) ? `'${value}` : value;

  return NEEDS_QUOTES.test(guarded)
    ? `"${guarded.replace(/"/g, '""')}"`
    : guarded;
}

export function toCsv(headers: string[], rows: CsvValue[][]): string {
  const lines = [headers, ...rows].map((row) => row.map(csvCell).join(","));
  return `${UTF8_BOM}${lines.join("\r\n")}\r\n`;
}

/**
 * A download, not a page.
 *
 * `no-store` because every one of these files is a list of customers' names,
 * phone numbers and email addresses: it must not sit in a shared cache, and it
 * must not come back stale from the browser's when the studio downloads it
 * again ten minutes later expecting the booking they just took to be in it.
 */
export function csvResponse(filename: string, body: string): Response {
  return new Response(body, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="${filename}"`,
      "cache-control": "no-store, max-age=0",
    },
  });
}
