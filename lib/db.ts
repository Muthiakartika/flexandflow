/**
 * The Prisma client, one per process.
 *
 * Prisma 7 has no Rust query engine: it talks to Postgres through a driver
 * adapter. On Vercel that adapter is Neon's serverless driver, which reaches
 * the database over HTTP/WebSocket rather than holding a TCP pool a Lambda
 * cannot keep alive between invocations.
 *
 * The global cache is the standard dev-server guard: without it, every hot
 * reload constructs another client and Postgres runs out of connections after
 * a few dozen edits.
 */
import "server-only";

import { PrismaNeon } from "@prisma/adapter-neon";

import { PrismaClient } from "@/generated/prisma/client";
import { env } from "@/lib/env";

/**
 * Postgres raises this when the `booking_no_overlap` exclusion constraint
 * rejects an insert — two people confirmed the same slot at the same moment.
 * It is the one database error the booking route treats as an expected
 * outcome rather than a fault. See `prisma/migrations/*_booking_no_overlap`.
 */
export const PG_EXCLUSION_VIOLATION = "23P01";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

function create(): PrismaClient {
  const adapter = new PrismaNeon({ connectionString: env().DATABASE_URL });

  const client = new PrismaClient({
    adapter,
    /* Emitted rather than printed, so the one expected failure can be filtered
       out below. Without that, `log: ["error"]` prints every rejected insert. */
    log:
      process.env.NODE_ENV === "development"
        ? [{ emit: "event", level: "error" }, { emit: "stdout", level: "warn" }]
        : [{ emit: "event", level: "error" }],
  });

  /*
   * Two people confirming the same slot is not a fault, and must not read like
   * one.
   *
   * `booking_no_overlap` rejecting an insert is the constraint doing the single
   * job it exists for, and the booking route already catches it and tells the
   * customer their slot has just gone. But Prisma logs the rejection itself,
   * before any of our code sees it — so a routine race printed `prisma:error`
   * into the deployment log beside genuine faults. Logs that cry wolf get
   * ignored, and the next real error goes with them.
   *
   * Only this one code is dropped. Everything else Prisma reports still prints.
   */
  client.$on("error", (event) => {
    const message = String(event.message ?? "");
    if (
      message.includes(PG_EXCLUSION_VIOLATION) ||
      message.includes("booking_no_overlap")
    ) {
      return;
    }
    console.error("[prisma]", message);
  });

  return client;
}

function instance(): PrismaClient {
  globalForPrisma.prisma ??= create();
  return globalForPrisma.prisma;
}

/**
 * The client, constructed on first use rather than on import.
 *
 * This has to be a `Proxy` and not a plain `const`. `next build` imports every
 * route module to collect its metadata, and it does that with no runtime
 * environment — so a client built at module scope would call `env()` during the
 * build, find no `DATABASE_URL`, and fail the whole build on a route that was
 * never going to run. Deferring to first property access means the connection
 * string is read when a request actually needs the database.
 *
 * Callers see an ordinary `PrismaClient`: `prisma.booking.findMany()` works
 * exactly as it reads. Only `get` and `has` are trapped — enumerating a Prisma
 * client is not something any caller does, and the proxy invariants around
 * `ownKeys` on an empty target are a trap worth not setting.
 */
export const prisma: PrismaClient = new Proxy({} as PrismaClient, {
  get(_target, property, receiver) {
    return Reflect.get(instance(), property, receiver);
  },
  has(_target, property) {
    return Reflect.has(instance(), property);
  },
});

export function isSlotTakenError(error: unknown): boolean {
  if (typeof error !== "object" || error === null) return false;

  const candidate = error as {
    code?: unknown;
    meta?: { code?: unknown };
    cause?: unknown;
  };

  if (candidate.code === PG_EXCLUSION_VIOLATION) return true;
  if (candidate.meta?.code === PG_EXCLUSION_VIOLATION) return true;

  const message = String(
    (error as { message?: unknown }).message ?? "",
  ).toLowerCase();

  return (
    message.includes(PG_EXCLUSION_VIOLATION) ||
    message.includes("booking_no_overlap")
  );
}
