# Scheduled jobs

Two endpoints keep the booking system's outbound messages moving. Both are
guarded by `CRON_SECRET` and answer to either `GET` (what Vercel Cron sends) or
`POST` (so any other scheduler can drive them).

| Endpoint | Schedule | What it does |
|---|---|---|
| `/api/cron/dispatch` | every 10 minutes | Sends every queued notification that is due, and retries the ones that failed. This is the retry path — the first attempt already happened inline, right after the booking was written. |
| `/api/cron/reminders` | `0 2 * * *` (UTC) = **10:00 WITA** | Queues the H-1 reminder for every session starting tomorrow, then dispatches. |

`vercel.json` declares both.

## The Hobby-plan problem, and the way around it

**Vercel's Hobby plan allows one cron job, once a day, at an imprecise time.**
The ten-minute retry loop above needs the Pro plan (~$20/month).

There is a free alternative, and for this studio it is the better one: the
server already running WAHA is on all the time, so let it drive the schedule.
On that box, `crontab -e`:

```cron
*/10 * * * * curl -fsS -X POST -H "Authorization: Bearer $CRON_SECRET" https://flexandflow.fit/api/cron/dispatch  >/dev/null 2>&1
0    2 * * * curl -fsS -X POST -H "Authorization: Bearer $CRON_SECRET" https://flexandflow.fit/api/cron/reminders >/dev/null 2>&1
```

Put `CRON_SECRET` in `/etc/environment` or inline it — but if you inline it,
`chmod 600` the crontab, because a secret in a world-readable file is not a
secret.

If you go this route, delete the `crons` block from `vercel.json`. Leaving both
in place means every job runs twice; the notification queue is idempotent so
nothing sends twice, but the wasted invocations are pointless.

## Checking it works

```bash
curl -i -X POST -H "Authorization: Bearer $CRON_SECRET" https://flexandflow.fit/api/cron/dispatch
```

A `401` means the secret does not match. A `200` returns a count of what it
attempted, sent, failed and gave up on.

The admin panel's Settings page shows the same queue, including failures and
their error messages — that is the page to open when a customer says they never
received anything.
