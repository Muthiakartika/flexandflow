# Scheduled jobs

Two endpoints keep the booking system's outbound messages moving. Both are
guarded by `CRON_SECRET` and answer to either `GET` or `POST`, so anything that
can make an authenticated HTTP request can drive them.

| Endpoint | Schedule | What it does |
|---|---|---|
| `/api/cron/dispatch` | every 30 minutes | Sends every queued notification that is due, and retries the ones that failed. |
| `/api/cron/reminders` | `0 2 * * *` (UTC) = **10:00 WITA** | Queues the H-1 reminder for every session starting tomorrow, then dispatches. |

## What actually breaks without them

Not confirmations. A booking's email and WhatsApp go out inline, from `after()`,
the moment the booking commits — a customer gets their confirmation whether or
not any scheduler ever runs.

What the schedule owns is the part nothing else covers:

- **Retries.** When WAHA has quietly logged out or SendGrid rate-limits, the job
  stays `PENDING` with a backoff of 1m, 5m, 15m, 1h, 6h. Something has to come
  back and try again. Without that, a message that failed once has failed for
  good, and the studio finds out from a customer.
- **Reminders.** Nothing else queues them. No schedule, no reminders, ever.

## How it runs: GitHub Actions

[`.github/workflows/booking-cron.yml`](.github/workflows/booking-cron.yml).

**Vercel Cron is not used.** Its Hobby plan allows one job a day at an imprecise
time, which is not enough for a retry loop, and the next tier up is a
subscription for two `curl`s a day.

Two settings, both under **Settings → Secrets and variables → Actions**:

| | Kind | Value |
|---|---|---|
| `CRON_SECRET` | Secret | Exactly what the Vercel environment has. A mismatch shows up as `401`. |
| `SITE_URL` | Variable (optional) | Point at a preview deployment while testing. Defaults to `https://flexandflow.fit`. |

The workflow adds a **Run workflow** button on the Actions tab, which drains the
queue immediately — the thing to press after fixing a logged-out WAHA session
rather than waiting out the half hour.

### Two GitHub behaviours to know rather than discover

**The scheduler is not punctual.** GitHub documents that scheduled runs are
delayed under load and can be skipped. Five to fifteen minutes late is ordinary.
Both jobs tolerate it: retries are not time-critical, and the reminder fires with
most of a day in hand.

**Public repositories have their schedules disabled after 60 days without a
commit.** GitHub emails first; re-enable from the Actions tab.

### Why 30 minutes and not 10

On a **private** repository each run is billed rounded up to a whole minute, and
the Free plan allows 2,000 minutes a month. `*/10` is about 4,320 runs — well
past the allowance. `*/30` is about 1,440, which fits.

If this repository is **public**, Actions minutes are not metered. Change the
first schedule to `*/10 * * * *`; it is free there and strictly better, since the
queue's own backoff starts at one minute and a 30-minute sweep flattens the first
two retry steps.

## Alternatives, if you would rather not use Actions

**The VPS already running WAHA** is the best of them: it is on around the clock,
its cron is punctual to the second, there is no minute quota and no 60-day rule.

```cron
*/10 * * * * curl -fsS -X POST -H "Authorization: Bearer $CRON_SECRET" https://flexandflow.fit/api/cron/dispatch/  >/dev/null 2>&1
0    2 * * * curl -fsS -X POST -H "Authorization: Bearer $CRON_SECRET" https://flexandflow.fit/api/cron/reminders/ >/dev/null 2>&1
```

Put `CRON_SECRET` in `/etc/environment`, or inline it and `chmod 600` the
crontab — a secret in a world-readable file is not a secret.

A hosted pinger such as cron-job.org works too, and is punctual.

**Whichever you pick, run only one.** Two schedulers will not double-send — the
queue claims each job before sending, and the unique index on
`(bookingId, channel, kind, target)` makes a repeat impossible — but the second
one is pure waste.

## Checking it works

```bash
curl -i -X POST -H "Authorization: Bearer $CRON_SECRET" https://flexandflow.fit/api/cron/dispatch/
```

`401` means the secret does not match. `200` returns a count of what it
attempted, sent, failed and gave up on.

The admin panel's Settings page shows the same queue, including failures and
their error messages — that is the page to open when a customer says they never
received anything.
