/**
 * The studio's Google Sheet, over the Sheets and Drive APIs. Nothing more.
 *
 * A service account, not an OAuth login — the studio shares one Sheet with
 * the service account's own email once (see INTAKE-PLAN.md's go-live
 * checklist), and every call after that is server-to-server. Configured on
 * first use, not at import time, for the same reason `lib/notifications`'s
 * transports are: `next build` imports route modules with no runtime
 * environment.
 */
import "server-only";

import { google } from "googleapis";

import { env, sheetsEnabled } from "@/lib/env";

let cachedAuth: InstanceType<typeof google.auth.GoogleAuth> | null = null;

function auth(): InstanceType<typeof google.auth.GoogleAuth> {
  if (!cachedAuth) {
    const { GOOGLE_SERVICE_ACCOUNT_EMAIL, GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY } = env();
    if (!GOOGLE_SERVICE_ACCOUNT_EMAIL || !GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY) {
      throw new Error("Google service account credentials are not configured.");
    }

    cachedAuth = new google.auth.GoogleAuth({
      credentials: {
        client_email: GOOGLE_SERVICE_ACCOUNT_EMAIL,
        private_key: GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY,
      },
      /* Broad Drive scope, not drive.file: the Sheet already exists and is
         shared with the service account out of band, rather than created by
         this app — drive.file only covers files the API itself created. */
      scopes: [
        "https://www.googleapis.com/auth/spreadsheets",
        "https://www.googleapis.com/auth/drive",
      ],
    });
  }

  return cachedAuth;
}

function sheets() {
  return google.sheets({ version: "v4", auth: auth() });
}

function drive() {
  return google.drive({ version: "v3", auth: auth() });
}

export type SheetResult = { ok: true } | { ok: false; error: string };

/**
 * Appends one data row. When `headerRow` is given, the sheet's first row is
 * refreshed to include new fields and edited labels. Archived definitions
 * retain their column positions so existing answer rows stay aligned.
 */
export async function appendIntakeRow(
  row: string[],
  headerRow?: string[],
): Promise<SheetResult> {
  const { GOOGLE_SHEET_ID } = env();
  if (!sheetsEnabled() || !GOOGLE_SHEET_ID) {
    return { ok: false, error: "Google Sheets is not configured." };
  }

  try {
    if (headerRow) {
      // Archived fields retain their columns; new fields append at the end.
      // Refresh labels and newly added columns without rewriting old answers.
        await sheets().spreadsheets.values.update({
          spreadsheetId: GOOGLE_SHEET_ID,
          range: "Sheet1!A1",
          valueInputOption: "RAW",
          requestBody: { values: [headerRow] },
        });
    }

    await sheets().spreadsheets.values.append({
      spreadsheetId: GOOGLE_SHEET_ID,
      range: "Sheet1!A1",
      valueInputOption: "RAW",
      insertDataOption: "INSERT_ROWS",
      requestBody: { values: [row] },
    });
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  }
}

/**
 * Shares the sheet with one address. Default role is **reader** — least
 * privilege for someone who just needs to see submissions land; the admin
 * settings form can be changed to `"writer"` if the studio wants to annotate
 * the sheet directly.
 */
export async function shareSheetWith(
  email: string,
  role: "reader" | "writer" = "reader",
): Promise<SheetResult> {
  const { GOOGLE_SHEET_ID } = env();
  if (!sheetsEnabled() || !GOOGLE_SHEET_ID) {
    return { ok: false, error: "Google Sheets is not configured." };
  }

  try {
    await drive().permissions.create({
      fileId: GOOGLE_SHEET_ID,
      sendNotificationEmail: true,
      requestBody: { type: "user", role, emailAddress: email },
    });
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  }
}
